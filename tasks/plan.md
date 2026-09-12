# خطة: نظام الفريق والأدوار والصلاحيات (Team + Roles + Permissions)

## الحالة المسبقة (مكتشف أثناء الفحص)
- لا يوجد جدول `companies` — العزل الحالي كله عبر `projects.created_by = auth.uid()`.
- لا يوجد `company_members` ولا أي نظام أدوار.
- السايدبار + الإعدادات نصّبان يدوياً (ternaries) وليسا ترجمة next-intl — نتبع هذا النمط.
- لا Trigger لإنشاء `profiles` — حالياً يُنشأ بـ upsert من الواجهة (ProfileSettings).

## القرارات (مقررة مع المالك)
1. إنشاء `companies` + `company_members`، وترحيل صف owner نشط لكل مستخدم حالي
   (شركة واحدة لكل مستخدم). المسجّلون الجدد تُنشأ لهم شركة+مالك عبر Trigger
   `handle_new_user` ما لم يكن بريدهم «محجوزاً» مسبقاً في `company_members` (عضو مُضاف إدارياً).
2. مشاريع: إضافة `company_id` + سياسات RLS عضوية؛ وكتابة محدودة في خدمة المشاريع
   فقط (`getAll` / `create` / `getById`) — بدون إعادة تصميم صفحات المشاريع/التبويبات/اليومية.

## الأدوار والصلاحيات (MVP)
- owner: الكل. admin: الكل ما عدا صلاحيات مقتصرة. member: تشغيلي.
- المصفوفة:
  - manage_team: owner, admin
  - manage_company_settings: owner, admin
  - manage_projects: owner, admin
  - edit_field_data: owner, admin, member
  - manage_procurement: owner, admin, member
  - manage_finance: owner, admin
  - view_projects: owner, admin, member

## الأمان قبل الكود (سيناريوهات إساءة الاستخدام)
- مفتاح service role موجود في `SERVICE_ROLE_KEY` ويُستخدم ONLY داخل API الخادم
  (`src/lib/supabase/admin.ts`). أي import له من عميل = تسريب كامل للقاعدة → يتم
  فصله في module مستقل لا يستورده أي client component.
- إنشاء مستخدم إدارياً: يُرفض `role=owner`، ويمنع بريد مكرر داخل نفس الشركة
  (Unique في DB + فحص مسبق)، ويمنع دخول بريد مسجَّل مسبقاً في `auth.users`
  (لا حساب مكرر: العضو الذي سُجّل سابقاً له شركة خاصة به — خارج نطاق الدعوة هنا).
- تعطيل/إزالة آخر owner: ممنوع عبر RLS Trigger + فحص في API.
- كلمة المرور المؤقتة تُرجَع مرة واحدة فقط للمنفّذ، ولا تُخزَّن نصّياً إطلاقاً.
- التعطيل يقطع الوصول فورياً عبر سياسات RLS (المستخدم يفقد عضوية active → يفقد
  المشاريع/الفريق/الصفحات كاملة؛ حسابه يبقى لكن بلا وصول للشركة).

## خطوات التنفيذ
1. SQL migration واحدة كاملة.
2. permissions.ts + types/team.ts.
3. admin client (server-only) + team-service + team-admin-service.
4. API routes (POST members / PATCH member).
5. تعديل محدود projects-service + proxy (حماية /roles).
6. Sidebar + صفحة /roles + الإعدادات→الفريق.
7. فحوصات: check:design / lint / build.

## نقاط يجب أن يراجعها المالك شخصياً
- عبارات SQL للـ RLS والـ triggers (مصيرية).
- اسم البيئة `SERVICE_ROLE_KEY` وعدم تسريبه.
- سلوك التراجع للمستخدمين الحاليين (كل مستخدم أصبح owner لشركته).
- قرار عدم إتاحة الوصول لـ daily_logs/workers/equipment للعضو (مرحلة لاحقة).