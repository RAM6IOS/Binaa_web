import { createClient as createBrowserClient } from '../supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { Equipment, EquipmentRental, EquipmentAvailability, RentalStatus } from '../types/projects';
import { notificationService } from './notification-service';

// دالة مساعدة لاختيار العميل المناسب (متصفح أو خادم)
const getSupabase = (customClient?: SupabaseClient) => {
  return customClient || createBrowserClient();
};

type ProfileSnippet = { id: string; full_name: string | null };

/** جلب ملفات المستخدمين يدوياً (FK يشير إلى auth.users وليس profiles) */
async function fetchProfilesByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, ProfileSnippet>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', uniqueIds);

  if (error) throw error;
  return new Map((data || []).map((p) => [p.id, p as ProfileSnippet]));
}

function enrichRentalsWithRenters<T extends { renter_id: string }>(
  rentals: T[],
  profiles: Map<string, ProfileSnippet>
): (T & { renter?: { id: string; full_name: string } })[] {
  return rentals.map((r) => {
    const profile = profiles.get(r.renter_id);
    return {
      ...r,
      renter: profile
        ? { id: profile.id, full_name: profile.full_name || '' }
        : undefined,
    };
  });
}

function enrichRentalsWithOwners<T extends { owner_id: string }>(
  rentals: T[],
  profiles: Map<string, ProfileSnippet>
): (T & { owner?: { id: string; full_name: string } })[] {
  return rentals.map((r) => {
    const profile = profiles.get(r.owner_id);
    return {
      ...r,
      owner: profile
        ? { id: profile.id, full_name: profile.full_name || '' }
        : undefined,
    };
  });
}

// معادلة Haversine لحساب المسافة الجغرافية بالكيلومترات
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // نصف قطر الأرض بالكيلومترات
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // المسافة بالكيلومترات
}

export const rentalService = {
  /**
   * حساب تكلفة التأجير الإجمالية بناءً على السعر اليومي وتاريخ البدء والانتهاء
   */
  calculateRentalCost(dailyRate: number, startDate: Date | string, endDate: Date | string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // ضبط الوقت للتخلص من فروق الساعات
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // حجز شامل يوم البداية والنهاية
    return diffDays * dailyRate;
  },

  /**
   * التحقق من توفر المعدة في فترة معينة (عدم وجود حجز متداخل وموافق عليه)
   */
  async checkEquipmentAvailability(
    equipmentId: string,
    startDate: string,
    endDate: string,
    customClient?: SupabaseClient
  ): Promise<boolean> {
    const supabase = getSupabase(customClient);

    const { data: rentals, error } = await supabase
      .from('equipment_rentals')
      .select('id')
      .eq('equipment_id', equipmentId)
      .not('status', 'in', '("rejected", "completed")')
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (error) {
      console.error('Error checking availability:', error.message);
      throw error;
    }

    return rentals.length === 0;
  },

  /**
   * جلب ميزانية العتاد المتبقية لمشروع معين
   */
  async getProjectRemainingBudget(
    projectId: string,
    customClient?: SupabaseClient
  ): Promise<{ planned: number; actual: number; remaining: number }> {
    const supabase = getSupabase(customClient);

    const { data, error } = await supabase
      .from('project_budgets')
      .select('planned_amount, actual_amount')
      .eq('project_id', projectId)
      .eq('category', 'equipment')
      .maybeSingle();

    if (error) {
      console.error('Error fetching project budget:', error.message);
      return { planned: 0, actual: 0, remaining: 0 };
    }

    if (!data) return { planned: 0, actual: 0, remaining: 0 };

    const planned = Number(data.planned_amount);
    const actual = Number(data.actual_amount);
    return {
      planned,
      actual,
      remaining: Math.max(0, planned - actual),
    };
  },

  /**
   * تقديم طلب تأجير جديد مع التحقق من التوفر والميزانية
   */
  async createRentalRequest(
    input: {
      equipment_id: string;
      project_id?: string;
      renter_id: string;
      owner_id: string;
      start_date: string;
      end_date: string;
      notes?: string;
    },
    customClient?: SupabaseClient
  ): Promise<EquipmentRental> {
    const supabase = getSupabase(customClient);

    // 1. التحقق من أن المستأجر ليس هو المالك
    if (input.renter_id === input.owner_id) {
      throw new Error('لا يمكنك استئجار عتادك الخاص.');
    }

    // 2. التحقق من توفر المعدة في التواريخ المحددة
    const isAvailable = await this.checkEquipmentAvailability(
      input.equipment_id,
      input.start_date,
      input.end_date,
      supabase
    );
    if (!isAvailable) {
      throw new Error('هذه المعدة محجوزة بالفعل في التواريخ المحددة.');
    }

    // 3. جلب تفاصيل المعدة لحساب التكلفة الإجمالية
    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', input.equipment_id)
      .single();

    if (equipError || !equipment) {
      throw new Error('فشل العثور على المعدة المحددة.');
    }

    const totalCost = this.calculateRentalCost(
      equipment.rent_daily_rate || equipment.daily_rate,
      input.start_date,
      input.end_date
    );

    // 4. التحقق من ميزانية المشروع إذا تم تحديده
    let budgetWarning = false;
    if (input.project_id) {
      const budget = await this.getProjectRemainingBudget(input.project_id, supabase);
      if (budget.remaining < totalCost) {
        budgetWarning = true;
      }
    }

    // 5. إدراج طلب التأجير
    const { data: rental, error: insertError } = await supabase
      .from('equipment_rentals')
      .insert([
        {
          equipment_id: input.equipment_id,
          project_id: input.project_id || null,
          renter_id: input.renter_id,
          owner_id: input.owner_id,
          start_date: input.start_date,
          end_date: input.end_date,
          total_cost: totalCost,
          status: 'pending',
          notes: input.notes || '',
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting rental request:', insertError.message);
      throw insertError;
    }

    // 6. إرسال إشعار للمالك بالطلب الجديد
    try {
      const { data: renterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', input.renter_id)
        .maybeSingle();

      const renterName = renterProfile?.full_name || 'مقاول آخر';

      await notificationService.createNotification(
        {
          user_id: input.owner_id,
          title: 'طلب تأجير عتاد جديد',
          title_ar: 'طلب تأجير عتاد جديد',
          title_fr: 'Nouvelle demande de location de matériel',
          body: `يرغب المقاول ${renterName} في استئجار عتادك "${equipment.name}" للمشروع الخاص به.`,
          content_ar: `يرغب المقاول ${renterName} في استئجار عتادك "${equipment.name}" من تاريخ ${input.start_date} إلى ${input.end_date}.`,
          content_fr: `L'entrepreneur ${renterName} souhaite louer votre matériel "${equipment.name}" du ${input.start_date} au ${input.end_date}.`,
          type: 'equipment_rental_request',
          entity_type: 'equipment_rentals',
          entity_id: rental.id,
        },
        supabase
      );
    } catch (notifErr) {
      console.error('Error creating rental notification:', notifErr);
    }

    return rental as EquipmentRental;
  },

  /**
   * جلب المعدات المعروضة للتأجير مع الفلاتر ودعم الـ GPS
   */
  async getAvailableEquipment(
    filters: {
      category?: string;
      wilaya?: string;
      searchQuery?: string;
      minPrice?: number;
      maxPrice?: number;
      userLat?: number;
      userLon?: number;
    },
    customClient?: SupabaseClient
  ): Promise<(Equipment & { distance?: number })[]> {
    const supabase = getSupabase(customClient);

    let query = supabase
      .from('equipment')
      .select('*')
      .eq('is_for_rent', true);

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.wilaya && filters.wilaya !== 'all') {
      query = query.eq('wilaya', filters.wilaya);
    }

    if (filters.minPrice) {
      query = query.gte('rent_daily_rate', filters.minPrice);
    }

    if (filters.maxPrice) {
      query = query.lte('rent_daily_rate', filters.maxPrice);
    }

    const { data: equipmentList, error } = await query;

    if (error) {
      console.error('Error fetching rental equipment:', error.message);
      throw error;
    }

    let results = (equipmentList || []) as (Equipment & { distance?: number })[];

    // فلترة البحث النصي بالاسم أو العلامة التجارية
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      results = results.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.brand.toLowerCase().includes(q) ||
          (e.model && e.model.toLowerCase().includes(q))
      );
    }

    // حساب المسافة لو إحداثيات GPS الخاصة بالمستخدم متوفرة
    if (filters.userLat !== undefined && filters.userLon !== undefined) {
      results = results.map((e) => {
        let distance: number | undefined;
        if (e.gps_coordinates) {
          const [latStr, lonStr] = e.gps_coordinates.split(',');
          const lat = parseFloat(latStr.trim());
          const lon = parseFloat(lonStr.trim());
          if (!isNaN(lat) && !isNaN(lon)) {
            distance = calculateDistance(filters.userLat!, filters.userLon!, lat, lon);
          }
        }
        return { ...e, distance };
      });

      // ترتيب المعدات حسب الأقرب جغرافياً أولاً
      results.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    }

    return results;
  },

  /**
   * جلب طلبات التأجير الصادرة والواردة للمستخدم
   */
  async getMyRentals(
    userId: string,
    customClient?: SupabaseClient
  ): Promise<{ requested: EquipmentRental[]; received: EquipmentRental[] }> {
    const supabase = getSupabase(customClient);

    const rentalSelect = `
      *,
      equipment:equipment!equipment_rentals_equipment_id_fkey(*),
      project:projects(id, name)
    `;

    // 1. الطلبات التي قمت بإرسالها (Renter)
    const { data: requested, error: reqError } = await supabase
      .from('equipment_rentals')
      .select(rentalSelect)
      .eq('renter_id', userId)
      .order('created_at', { ascending: false });

    if (reqError) {
      console.error('Error fetching requested rentals:', reqError.message);
      throw reqError;
    }

    // 2. الطلبات التي تلقيتها على معداتي (Owner)
    const { data: received, error: recError } = await supabase
      .from('equipment_rentals')
      .select(rentalSelect)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (recError) {
      console.error('Error fetching received rentals:', recError.message);
      throw recError;
    }

    // جلب أسماء المستخدمين
    const allUserIds = Array.from(new Set([
      ...(requested || []).map(r => r.owner_id),
      ...(received || []).map(r => r.renter_id),
    ])).filter(Boolean);

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allUserIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    const enrichedRequested = (requested || []).map(r => ({
      ...r,
      owner: profilesMap.get(r.owner_id) || undefined,
    }));

    const enrichedReceived = (received || []).map(r => ({
      ...r,
      renter: profilesMap.get(r.renter_id) || undefined,
    }));

    return {
      requested: enrichedRequested as EquipmentRental[],
      received: enrichedReceived as EquipmentRental[],
    };
  },

  /**
   * موافقة، رفض، أو إنهاء طلب التأجير
   */
  async updateRentalStatus(
    rentalId: string,
    status: RentalStatus,
    customClient?: SupabaseClient
  ): Promise<boolean> {
    const supabase = getSupabase(customClient);

    // 1. جلب بيانات طلب التأجير الحالي
    const { data: rental, error: fetchError } = await supabase
      .from('equipment_rentals')
      .select('*, equipment:equipment!equipment_rentals_equipment_id_fkey(*)')
      .eq('id', rentalId)
      .single();

    if (fetchError || !rental) {
      throw new Error('لم يتم العثور على طلب التأجير.');
    }

    // 2. تحديث الحالة
    const { error: updateError } = await supabase
      .from('equipment_rentals')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rentalId);

    if (updateError) {
      console.error('Error updating rental status:', updateError.message);
      throw updateError;
    }

    // 3. التكامل المالي والربط بالمشروع
    if (status === 'approved' || status === 'ongoing') {
      // إدراج المعدة في جدول العتاد المخصص للمشروع (project_equipment)
      // لكي تُحسب تكاليفها اليومية تلقائياً
      if (rental.project_id) {
        const { error: assignError } = await supabase
          .from('project_equipment')
          .insert([
            {
              project_id: rental.project_id,
              equipment_id: rental.equipment_id,
              usage_hours_per_day: 8, // القيمة الافتراضية
            },
          ]);

        if (assignError) {
          console.warn('Could not assign equipment to project_equipment automatically:', assignError.message);
        }
      }

      // إضافة فترة حجز عدم التوفر في جدول التوافر
      const { error: availError } = await supabase
        .from('equipment_availability')
        .insert([
          {
            equipment_id: rental.equipment_id,
            start_date: rental.start_date,
            end_date: rental.end_date,
            is_available: false,
            notes: `مؤجرة بموجب طلب رقم ${rentalId}`,
          },
        ]);

      if (availError) {
        console.warn('Could not block availability period:', availError.message);
      }
    } else if (status === 'completed' || status === 'rejected') {
      // إزالة المعدة من مشروع المقاول المستأجر
      if (rental.project_id) {
        const { error: removeError } = await supabase
          .from('project_equipment')
          .delete()
          .eq('project_id', rental.project_id)
          .eq('equipment_id', rental.equipment_id);

        if (removeError) {
          console.warn('Could not delete from project_equipment:', removeError.message);
        }
      }

      // في حال الإكمال أو الرفض، نقوم بإزالة حظر التوافر لتلك الفترة
      if (status === 'rejected') {
        const { error: removeAvailError } = await supabase
          .from('equipment_availability')
          .delete()
          .eq('equipment_id', rental.equipment_id)
          .eq('start_date', rental.start_date)
          .eq('end_date', rental.end_date);

        if (removeAvailError) {
          console.warn('Could not release availability period:', removeAvailError.message);
        }
      }
    }

    // 4. إرسال إشعار للمستأجر بالحالة الجديدة لطلبه
    try {
      let titleAr = '';
      let titleFr = '';
      let bodyAr = '';
      let bodyFr = '';

      if (status === 'approved') {
        titleAr = 'تم قبول طلب التأجير';
        titleFr = 'Demande de location acceptée';
        bodyAr = `وافق مالك المعدة على طلبك لاستئجار "${rental.equipment.name}".`;
        bodyFr = `Le propriétaire du matériel a accepté votre demande pour "${rental.equipment.name}".`;
      } else if (status === 'rejected') {
        titleAr = 'تم رفض طلب التأجير';
        titleFr = 'Demande de location refusée';
        bodyAr = `تم رفض طلبك لاستئجار المعدة "${rental.equipment.name}".`;
        bodyFr = `Votre demande de location pour "${rental.equipment.name}" a été refusée.`;
      } else if (status === 'completed') {
        titleAr = 'اكتملت فترة التأجير';
        titleFr = 'Location terminée';
        bodyAr = `تم إنهاء تأجير المعدة "${rental.equipment.name}" بنجاح.`;
        bodyFr = `La location du matériel "${rental.equipment.name}" a été clôturée avec succès.`;
      }

      if (titleAr) {
        await notificationService.createNotification(
          {
            user_id: rental.renter_id,
            title: titleAr,
            title_ar: titleAr,
            title_fr: titleFr,
            body: bodyAr,
            content_ar: bodyAr,
            content_fr: bodyFr,
            type: `equipment_rental_${status}`,
            entity_type: 'equipment_rentals',
            entity_id: rentalId,
          },
          supabase
        );
      }
    } catch (notifError) {
      console.error('Error creating rental update notification:', notifError);
    }

    return true;
  },

  /**
   * جلب فترات عدم التوفر لمعدة معينة
   */
  async getEquipmentAvailability(
    equipmentId: string,
    customClient?: SupabaseClient
  ): Promise<EquipmentAvailability[]> {
    const supabase = getSupabase(customClient);

    const { data, error } = await supabase
      .from('equipment_availability')
      .select('*')
      .eq('equipment_id', equipmentId);

    if (error) {
      console.error('Error fetching availability dates:', error.message);
      throw error;
    }

    return data as EquipmentAvailability[];
  },

  /**
   * إضافة فترة عدم توفر يدوياً من قِبل المالك
   */
  async addManualAvailabilityBlock(
    equipmentId: string,
    startDate: string,
    endDate: string,
    notes?: string,
    customClient?: SupabaseClient
  ): Promise<EquipmentAvailability> {
    const supabase = getSupabase(customClient);

    const { data, error } = await supabase
      .from('equipment_availability')
      .insert([
        {
          equipment_id: equipmentId,
          start_date: startDate,
          end_date: endDate,
          is_available: false,
          notes: notes || 'غير متاح يدوياً',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error blocking availability period:', error.message);
      throw error;
    }

    return data as EquipmentAvailability;
  },

  /**
   * جلب معدات المستخدم المعروضة للتأجير مع طلباتها الواردة
   */
  async getMyEquipmentForRent(
    userId: string,
    customClient?: SupabaseClient
  ): Promise<(Equipment & { incoming_requests: EquipmentRental[] })[]> {
    const supabase = getSupabase(customClient);

    const { data: equipment, error } = await supabase
      .from('equipment')
      .select(`
        *,
        incoming_requests:equipment_rentals!equipment_rentals_equipment_id_fkey(
          *,
          project:projects(id, name)
        )
      `)
      .eq('owner_id', userId)
      .eq('is_for_rent', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching owner equipment:', error.message);
      throw error;
    }

    const renterIds = (equipment || []).flatMap((eq) =>
      (eq.incoming_requests || []).map((r: { renter_id: string }) => r.renter_id)
    );
    const renterProfiles = await fetchProfilesByIds(supabase, renterIds);

    return (equipment || []).map((eq) => ({
      ...eq,
      incoming_requests: enrichRentalsWithRenters(
        eq.incoming_requests || [],
        renterProfiles
      ),
    })) as (Equipment & { incoming_requests: EquipmentRental[] })[];
  },

  /**
   * تفعيل أو إيقاف عرض المعدة للتأجير
   */
  async toggleEquipmentForRent(
    equipmentId: string,
    isForRent: boolean,
    rentalDetails?: {
      rent_daily_rate?: number;
      rent_hourly_rate?: number;
      description?: string;
      gps_coordinates?: string;
    },
    customClient?: SupabaseClient
  ): Promise<Equipment> {
    const supabase = getSupabase(customClient);

    const updates: Partial<Equipment> & { owner_id?: string } = {
      is_for_rent: isForRent,
      ...rentalDetails,
    };

    // ربط المعدة بالمستخدم الحالي كمالك عند تفعيل التأجير
    if (isForRent) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) updates.owner_id = user.id;
    }

    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', equipmentId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling equipment for rent:', error.message);
      throw error;
    }

    return data as Equipment;
  },

  /**
   * تحديث تفاصيل التأجير لمعدة معينة
   */
  async updateRentalEquipmentDetails(
    equipmentId: string,
    details: {
      rent_daily_rate?: number;
      rent_hourly_rate?: number;
      description?: string;
      gps_coordinates?: string;
    },
    customClient?: SupabaseClient
  ): Promise<Equipment> {
    const supabase = getSupabase(customClient);

    const { data, error } = await supabase
      .from('equipment')
      .update(details)
      .eq('id', equipmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating rental details:', error.message);
      throw error;
    }

    return data as Equipment;
  },

  /**
   * إضافة معدة جديدة للتأجير
   */
  async addRentalEquipment(
    equipmentData: {
      name: string;
      type: string;
      category: string;
      brand: string;
      model: string;
      serial_number: string;
      daily_rate: number;
      rent_daily_rate: number;
      rent_hourly_rate?: number;
      wilaya: string;
      rental_description?: string;
      description?: string;
      gps_coordinates?: string;
    },
    customClient?: SupabaseClient
  ): Promise<Equipment> {
    const supabase = getSupabase(customClient);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('يجب تسجيل الدخول لإضافة معدة.');
    }

    const { data, error } = await supabase
      .from('equipment')
      .insert([
        {
          name: equipmentData.name,
          type: equipmentData.type,
          category: equipmentData.category,
          brand: equipmentData.brand,
          model: equipmentData.model,
          serial_number: equipmentData.serial_number,
          daily_rate: Number(equipmentData.daily_rate),
          rent_daily_rate: Number(equipmentData.rent_daily_rate),
          rent_hourly_rate: equipmentData.rent_hourly_rate ? Number(equipmentData.rent_hourly_rate) : 0,
          wilaya: equipmentData.wilaya,
          rental_description: equipmentData.rental_description || equipmentData.description || '',
          description: equipmentData.description || equipmentData.rental_description || '',
          gps_coordinates: equipmentData.gps_coordinates || '',
          owner_id: user.id,
          is_for_rent: true,
          status: 'available',
          owner_type: 'company',
          total_hours_used: 0,
          hours_since_last_maintenance: 0,
          maintenance_status: 'up_to_date',
          maintenance_cost: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting rental equipment:', error.message);
      throw error;
    }

    return data as Equipment;
  },
};
