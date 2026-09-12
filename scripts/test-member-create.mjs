// ═══════════════════════════════════════════════════════════════════
// اختبار يدوي لمنطق createMemberByAdmin (بدون قاعدة بيانات — عميل وهمي)
//
// التشغيل: node scripts/test-member-create.mjs  (أو npm run test:member-create)
// يغطي الحالات المطلوبة:
//   1) إضافة بريد جديد بالكامل تنجح (C)
//   2) حذف عضو ثم إعادة نفس البريد تنجح — ربط بحساب موجود (B)
//   3) إعادة تفعيل عضو معطّل (A)
//   4) لا يُستدعى createUser إذا البريد موجود
//   5) لا يتكرر صف عضوية لنفس (user_id, company_id)
// ═══════════════════════════════════════════════════════════════════

import { createMemberByAdmin } from '../src/lib/services/team-admin-service.ts';

// ─────────────────────────────────────────────
// عميل وهمي يحاكي الشكل البنيوي المستخدم في الخدمة
// ─────────────────────────────────────────────
function createFakeAdmin({ memberByEmail = null, memberByUser = null, rpcUser = null, createUserError = null } = {}) {
  const calls = {
    createUser: [],
    updateUserById: [],
    inserts: [],
    updates: [],
    rpcCount: 0,
  };

  const from = (table) => {
    const filters = {};

    const selectBuilder = {
      eq: (col, val) => {
        filters[col] = val;
        return selectBuilder;
      },
      maybeSingle: async () => {
        if (typeof filters.email !== 'undefined') return { data: memberByEmail, error: null };
        if (typeof filters.user_id !== 'undefined') return { data: memberByUser, error: null };
        return { data: null, error: null };
      },
      single: async () => ({ data: null, error: null }),
    };

    return {
      select: () => selectBuilder,
      insert: (row) => ({
        select: () => ({
          single: async () => {
            calls.inserts.push(row);
            return { data: { id: 'm-' + row.email, ...row }, error: null };
          },
        }),
      }),
      update: (patch) => ({
        // .eq('id', …) يُهمَّل في الوهمي — نرصد التصحيح فقط
        eq: () => {
          calls.updates.push(patch);
          return Promise.resolve({ data: null, error: null });
        },
      }),
    };
  };

  return {
    calls,
    rpc: async () => {
      calls.rpcCount += 1;
      return { data: rpcUser, error: null };
    },
    from,
    auth: {
      admin: {
        createUser: async (attrs) => {
          calls.createUser.push(attrs);
          if (createUserError) return { data: { user: null }, error: { message: createUserError } };
          return { data: { user: { id: 'auth-new-id' } }, error: null };
        },
        updateUserById: async (uid, attrs) => {
          calls.updateUserById.push({ uid, attrs });
          return { error: null };
        },
      },
    },
  };
}

function member(over = {}) {
  return {
    id: 'm-1',
    company_id: 'company-1',
    user_id: 'user-1',
    email: 'a@example.com',
    full_name: 'أحمد بن علي',
    role: 'member',
    status: 'active',
    ...over,
  };
}

function input(over = {}) {
  return {
    companyId: 'company-1',
    full_name: 'أحمد بن علي',
    email: 'a@example.com',
    role: 'member',
    tempPassword: 'TempPass123',
    ...over,
  };
}

let passed = 0;
const failures = [];
const scenarioAdmins = [];

function assert(condition, label) {
  if (condition) {
    passed += 1;
  } else {
    failures.push(label);
    console.error('  ✗ FAIL — ' + label);
  }
}

const scenario = (name) => console.log('\n• ' + name);

const INSERTED_ROWS = (calls) => calls.inserts;

// ═══════════════════════════════════════════════════════════════════
scenario('C) إضافة بريد جديد تماماً — إنشاء حساب + عضوية مرتبطة');
// ─────────────────────────────────────────────────────────────
{
  const fake = createFakeAdmin({ rpcUser: null, memberByEmail: null });
  scenarioAdmins.push(fake);
  const res = await createMemberByAdmin(input(), fake);

  assert(res.case === 'created', 'case = created');
  assert(res.message === 'تم إنشاء العضو', 'رسالة (C) تطابق المطلوب');
  assert(res.tempPassword === 'TempPass123', 'تُرجَع الكلمة المؤقتة مرة واحدة');
  assert(fake.calls.createUser.length === 1, 'createUser استُدعي مرة واحدة');
  assert(fake.calls.createUser[0].email === 'a@example.com', 'createUser بالبريد نفسه');
  assert(
    fake.calls.createUser[0].app_metadata?.is_admin_created === true,
    'علامة is_admin_created تُمرَّر ليتجاوز الـ trigger شركة مستقلة'
  );
  assert(fake.calls.inserts.length === 1, 'أُدرج صف عضوية واحد');
  assert(INSERTED_ROWS(fake.calls)[0].user_id === 'auth-new-id', 'user_id إلزامي وغير null');
  assert(INSERTED_ROWS(fake.calls)[0].status === 'active', 'الحالة فوراً active');
  assert(fake.calls.updateUserById.length === 0, 'لا إعادة كلمة للحساب الجديد (ثُبِّتت عند الإنشاء)');
}

// ═══════════════════════════════════════════════════════════════════
scenario('B) حذف عضو ثم إعادة نفس البريد — حساب موجود بلا عضوية → ربط فقط');
// ─────────────────────────────────────────────────────────────
{
  const fake = createFakeAdmin({ rpcUser: 'user-1', memberByEmail: null });
  scenarioAdmins.push(fake);
  const res = await createMemberByAdmin(input(), fake);

  assert(res.case === 'linked', 'case = linked');
  assert(res.message === 'تمت إضافة العضو وربطه بحساب موجود', 'رسالة (B) تطابق المطلوب');
  assert(res.tempPassword === undefined, 'لا كلمة مؤقتة في الحالة (B) — المستخدم يحتفظ بكلمته');
  assert(fake.calls.createUser.length === 0, 'createUser لم يُستدع أبداً لبريد موجود');
  assert(fake.calls.inserts.length === 1, 'أُدرج صف عضوية واحد');
  assert(INSERTED_ROWS(fake.calls)[0].user_id === 'user-1', 'الصف مرتبط بحساب auth الموجود');
  assert(fake.calls.updateUserById.length === 0, 'لا تغيير على كلمة مرور المستخدم الحالي');
}

// ═══════════════════════════════════════════════════════════════════
scenario('A) عضو معطّل يُعاد تفعيله — تحديث الدور إن لزم + كلمة مؤقتة');
// ─────────────────────────────────────────────────────────────
{
  const existing = member({ status: 'disabled', role: 'member' });
  const fake = createFakeAdmin({ rpcUser: 'user-1', memberByEmail: existing });
  scenarioAdmins.push(fake);
  const res = await createMemberByAdmin(input({ role: 'admin' }), fake);

  assert(res.case === 'reactivated', 'case = reactivated');
  assert(res.message === 'تم تفعيل العضو مجدداً', 'رسالة (A) تطابق المطلوب');
  assert(res.tempPassword === 'TempPass123', 'تُرجَع كلمة مؤقتة للعضو المُفعَّل');
  assert(fake.calls.createUser.length === 0, 'createUser لم يُستدع');
  assert(fake.calls.inserts.length === 0, 'لا صف جديد — تحديث الصف الموجود');
  assert(fake.calls.updates.length === 1, 'حُدِّث صف العضوية');
  assert(fake.calls.updates[0].status === 'active', 'الحالة أصبحت active');
  assert(fake.calls.updates[0].user_id === 'user-1', 'بقيت مرتبطة بنفس الحساب');
  assert(fake.calls.updates[0].role === 'admin', 'الدور حُدِّث لأن الطلب طلب admin');
  assert(fake.calls.updateUserById.length === 1, 'أُعيدت الكلمة المؤقتة للحساب');
  assert(fake.calls.updateUserById[0].attrs.password === 'TempPass123', 'نفس الكلمة المؤقتة المُعادة');
}

// ═══════════════════════════════════════════════════════════════════
scenario('A) إعادة التفعيل دون تغيير الدور — لا يُكتب role زائد');
// ─────────────────────────────────────────────────────────────
{
  const fake = createFakeAdmin({ rpcUser: 'user-1', memberByEmail: member({ status: 'disabled', role: 'member' }) });
  scenarioAdmins.push(fake);
  await createMemberByAdmin(input({ role: 'member' }), fake);
  assert(!('role' in fake.calls.updates[0]), 'لا تحديث للدور عند تساوي القيمة (إن لزم فقط)');
}

// ═══════════════════════════════════════════════════════════════════
scenario('A/B) البريد مكرر على عضوية نشطة لنفس الحساب → رفض ولا إنشاء');
// ─────────────────────────────────────────────────────────────
{
  const fake = createFakeAdmin({ rpcUser: 'user-1', memberByEmail: member({ status: 'active' }) });
  scenarioAdmins.push(fake);
  let threw = false;
  try {
    await createMemberByAdmin(input(), fake);
  } catch (err) {
    threw = /نشط بالفعل/.test(err.message);
  }
  assert(threw, 'يُرفض الإدراج المكرر برسالة «عضو نشط بالفعل»');
  assert(fake.calls.createUser.length === 0 && fake.calls.inserts.length === 0, 'لا إنشاء ولا إدراج عند التكرار');
}

// ═══════════════════════════════════════════════════════════════════
scenario('استكمال صف invited معلّق — بلا حساب auth → إنشاء ثم ربط الصف (لا إدراج جديد)');
// ─────────────────────────────────────────────────────────────
{
  const fake = createFakeAdmin({ rpcUser: null, memberByEmail: member({ status: 'invited', user_id: null }) });
  scenarioAdmins.push(fake);
  const res = await createMemberByAdmin(input(), fake);

  assert(res.case === 'created', 'case = created (أُنشئ الحساب الآن فعلاً)');
  assert(fake.calls.createUser.length === 1, 'createUser استُدعي لاستكمال الحساب');
  assert(fake.calls.inserts.length === 0, 'لا صف جديد — يعاد استخدام صف invited');
  assert(fake.calls.updates.length === 1, 'حُدِّث صف invited');
  assert(fake.calls.updates[0].status === 'active', 'أصبح active');
  assert(fake.calls.updates[0].user_id === 'auth-new-id', 'رُبط بالحساب الجديد (user_id إلزامي)');
}

// ═══════════════════════════════════════════════════════════════════
scenario('منع تكرار (user_id, company_id): حساب يملك صفاً سابقاً ببريد مختلف → تحديث لا إدراج');
// ─────────────────────────────────────────────────────────────
{
  const byUser = member({ id: 'm-old', status: 'disabled', email: 'old@example.com' });
  const fake = createFakeAdmin({ rpcUser: 'user-1', memberByEmail: null, memberByUser: byUser });
  scenarioAdmins.push(fake);
  const res = await createMemberByAdmin(input(), fake);

  assert(res.case === 'linked', 'case = linked (أُعيد الربط بالحساب)');
  assert(fake.calls.inserts.length === 0, 'لا صف عضوية ثانٍ لنفس (user_id, company_id)');
  assert(fake.calls.updates.length === 1, 'حُدِّث الصف الموجود بدلاً من التكرار');
  assert(fake.calls.updates[0].email === 'a@example.com', 'البريد حُدِّث ليطابق الحساب الحالي');
  assert(fake.calls.updates[0].status === 'active', 'الصف عاد active');
}

// ═══════════════════════════════════════════════════════════════════
scenario('حماية الحساب: صف معطّل بحسابه الخاص بينما البريد ينتمي الآن لآخر → لا نلمس حساب الآخر');
// ─────────────────────────────────────────────
{
  const existing = member({ status: 'disabled', user_id: 'user-own' });
  const fake = createFakeAdmin({ rpcUser: 'user-global', memberByEmail: existing });
  scenarioAdmins.push(fake);
  const res = await createMemberByAdmin(input(), fake);

  assert(res.case === 'reactivated', 'case = reactivated (الصف عاد active)');
  assert(fake.calls.updateUserById.length === 1, 'أُعيدت كلمة مرور لحساب واحد');
  assert(fake.calls.updateUserById[0].uid === 'user-own', 'هدف إعادة الكلمة هو حساب الصف نفسه (user_id الخاص)');
  assert(fake.calls.updates[0].user_id === 'user-own', 'الصف بقي مرتبطاً بحسابه الأصلي لا بالحساب العالمي للبريد');
}

// ═══════════════════════════════════════════════════════════════════
scenario('تحقق شامل: كل صف مـُدرج في الاختبارات يرتبط بـ user_id وغير null');
// ─────────────────────────────────────────────────────────────
{
  let allLinked = true;
  for (const testAdmin of scenarioAdmins) {
    for (const row of testAdmin.calls.inserts) {
      if (!row.user_id) allLinked = false;
    }
  }
  assert(allLinked, 'لا يوجد أي صف membership أُدرج بلا user_id');
}

// ─────────────────────────────────────────────
// ملخص
// ─────────────────────────────────────────────
console.log(`\n═══════════════════════════════════`);
if (failures.length === 0) {
  console.log(`تم التنفيذ — ${passed} فحصاً ناجحاً ✅`);
  console.log(`لاحقاً: شغّل الميغريشن 20260911_member_reactivate_link.sql على قاعدة البيانات ثم تحقق يدوياً من العملية.`);
} else {
  console.error(`فشل ${failures.length} فحصاً من أصل ${passed + failures.length}:`);
  for (const f of failures) console.error('  • ' + f);
  process.exit(1);
}