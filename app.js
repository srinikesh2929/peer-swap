/* ====================== CONFIG ======================
   Fill these in after you create your free Supabase + EmailJS
   accounts. See README.md for exact steps.
=========================================================== */
const CONFIG = {
  SUPABASE_URL: "https://lankmtnsuxdvzijmbgiz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_XRTxSyoJ4uSgrvHShELsfA_DI1nEpru",
  EMAILJS_PUBLIC_KEY: "5TEjF-a35N0CuhZdP",
  EMAILJS_SERVICE_ID: "service_dkfanmm",
  EMAILJS_TEMPLATE_ID: "template_ewg3uug",
  COLLEGE_NAME: "Rajalakshmi Engineering College"
};

const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
if (window.emailjs) emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);

const FREE_TIME_SLOTS = ["Weekday Mornings", "Weekday Afternoons", "Weekday Evenings", "Weekends"];

/* ---------- cookie helpers ---------- */
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}
function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}
function clearCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/* ---------- current user helpers ---------- */
async function getCurrentProfile() {
  const uid = getCookie("swap_uid");
  if (!uid) return null;
  const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", uid).single();
  if (error) return null;
  return data;
}
function requireProfileOrRedirect() {
  const uid = getCookie("swap_uid");
  if (!uid) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

/* ---------- matching helpers ---------- */
// how many of the mentor's free-time slots overlap with the learner's
function overlapScore(a, b) {
  if (!a || !b) return 0;
  return a.filter(slot => b.includes(slot)).length;
}
function arraysShareItem(a, b) {
  if (!a || !b) return false;
  return a.some(x => b.includes(x));
}

/* ---------- vacancy helper ----------
   vacancy = max concurrent learners a mentor is willing to take on.
   "used" = number of requests currently accepted (not pending/declined). */
async function getMentorLoad(mentorId) {
  const { count, error } = await supabaseClient
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("mentor_id", mentorId)
    .eq("status", "accepted");
  if (error) return 0;
  return count || 0;
}

/* ---------- email notification ---------- */
async function sendMentorNotification({ mentorEmail, mentorName, learnerName, learnerEmail, skill, learnerFreeTime }) {
  if (!window.emailjs) return { ok: false, error: "EmailJS not loaded" };
  try {
    await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
      to_email: mentorEmail,
      mentor_name: mentorName,
      learner_name: learnerName,
      learner_email: learnerEmail,
      skill: skill,
      free_time: (learnerFreeTime || []).join(", "),
      college_name: CONFIG.COLLEGE_NAME
    });
    return { ok: true };
  } catch (err) {
    console.error("EmailJS error:", err);
    return { ok: false, error: err };
  }
}

/* ---------- small UI helper ---------- */
function starString(avg) {
  const rounded = Math.round(avg || 0);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}
