export type Locale = "fa" | "en";

const en = {
  "app.name": "DocuMind",
  "nav.dashboard": "Dashboard", "nav.documents": "Documents", "nav.collections": "Collections", "nav.chat": "AI Chat", "nav.settings": "Settings", "nav.signOut": "Sign out",
  "prefs.theme": "Switch light/dark theme", "prefs.light": "Light", "prefs.dark": "Dark", "prefs.language": "Change language",
  "units.kb": "{value} KB", "units.mb": "{value} MB", "units.gb": "{value} GB",
  "common.error": "Something went wrong. Please try again.", "common.delete": "Delete", "common.loading": "Loading…", "common.viewAll": "View all", "common.empty": "—",
  "status.READY": "Ready", "status.PROCESSING": "Processing", "status.UPLOADED": "Queued", "status.FAILED": "Failed",

  "login.eyebrow": "WELCOME BACK", "login.title": "Your documents, understood.", "login.subtitle": "Sign in to search and chat with your private knowledge base.",
  "login.username": "Username", "login.password": "Password", "login.submit": "Sign in", "login.busy": "Signing in…", "login.noAccount": "New here?", "login.register": "Create an account",
  "register.eyebrow": "GET STARTED", "register.title": "Create your workspace.", "register.username": "Username (Latin letters)", "register.email": "Email", "register.password": "Password (at least 8 characters)", "register.confirm": "Confirm password",
  "register.submit": "Create account", "register.busy": "Creating account…", "register.haveAccount": "Already registered?", "register.login": "Sign in",

  "dashboard.eyebrow": "YOUR WORKSPACE", "dashboard.greeting": "Welcome back", "dashboard.upload": "Upload document", "dashboard.newChat": "Ask a question",
  "kpi.documents": "Documents", "kpi.documentsHint": "{ready} ready to search", "kpi.storage": "Knowledge base", "kpi.storageHint": "{pages} pages · {words} words",
  "kpi.questions": "Questions asked", "kpi.questionsHint": "across {conversations} conversations", "kpi.answerRate": "Answer rate", "kpi.answerRateHint": "{answered} of {total} answered from your documents",
  "dashboard.processing": "{count} document(s) are being processed in the background.",
  "dashboard.activity": "Questions in the last 14 days", "dashboard.activityTotal": "{count} questions", "dashboard.activityEmpty": "No questions yet. Activity appears here as your team uses the chat.",
  "dashboard.tooltip": "{date}: {count} questions", "dashboard.showTable": "Show as table", "dashboard.hideTable": "Show as chart", "dashboard.colDate": "Date", "dashboard.colQuestions": "Questions",
  "dashboard.topDocs": "Most cited documents", "dashboard.topDocsEmpty": "Documents that answer questions most often will appear here.", "dashboard.citations": "{count} citations",
  "dashboard.gaps": "Knowledge gaps", "dashboard.gapsHint": "Recent questions your documents could not answer. Adding documents that cover them improves the assistant.", "dashboard.gapsEmpty": "No unanswered questions. Your documents covered everything asked so far.",
  "dashboard.types": "Document types", "dashboard.recent": "Recent documents", "dashboard.recentEmpty": "Upload your first document to get started.",

  "documents.eyebrow": "LIBRARY", "documents.title": "Documents", "documents.subtitle": "Files are processed in the background and stay private to your account.",
  "documents.upload": "Upload document", "documents.uploading": "Uploading…", "documents.name": "Name", "documents.size": "Size", "documents.status": "Status", "documents.added": "Added",
  "documents.empty": "Your library is ready.", "documents.emptyHint": "Upload PDF, Word, text, or Markdown files to make them searchable.", "documents.confirmDelete": "Delete this document and all data derived from it?",
  "documents.filter": "Filter by name…",

  "document.back": "Documents", "document.words": "{count} words", "document.pages": "{count} pages", "document.noPages": "No page numbers", "document.failed": "Processing this document failed. Please upload it again.",
  "document.summary": "Grounded summary", "document.summaryHint": "Once processing finishes, create a summary that relies only on this document.", "document.generate": "Generate summary", "document.generating": "Generating…",
  "document.pending": "This large document is being summarized in the background. Try again in a little while.",
  "document.search": "Search this document", "document.searchPlaceholder": "Search for a concept or question", "document.searchButton": "Search", "document.noResults": "No relevant passages found.",
  "document.page": "Page {page}", "document.whole": "Document", "document.match": "{value}% match", "document.loading": "Loading document…", "document.backToDocuments": "Back to documents",
  "summary.short": "Short", "summary.detailed": "Detailed", "summary.key_points": "Key points", "summary.executive": "Executive",

  "collections.eyebrow": "ORGANIZE", "collections.title": "Collections", "collections.subtitle": "Group related documents for focused search and research.",
  "collections.placeholder": "e.g. 2025 contracts", "collections.create": "Create", "collections.count": "{count} documents", "collections.confirmDelete": "Delete this collection? Its documents stay in your library.",
  "collections.empty": "Collections make questions across several documents easier to manage.",

  "chat.eyebrow": "GROUNDED AI", "chat.title": "Chat with your knowledge base", "chat.new": "New chat", "chat.conversations": "Conversations", "chat.newTitle": "New conversation",
  "chat.emptyTitle": "Ask anything about your documents.", "chat.emptyHint": "Answers cite their sources and say clearly when the documents do not contain enough evidence. Follow-up questions keep the context.",
  "chat.placeholder": "Ask a question… (Enter to send, Shift+Enter for a new line)", "chat.send": "Send", "chat.thinking": "Searching your documents…", "chat.sources": "Sources", "chat.page": "page {page}",
  "chat.copy": "Copy", "chat.copied": "Copied", "chat.suggestions": "Try asking",
  "chat.suggestion1": "Summarize the key obligations in our contracts.", "chat.suggestion2": "How many days of leave does each employee get?", "chat.suggestion3": "What deadlines or dates are mentioned?",

  "settings.eyebrow": "ACCOUNT", "settings.title": "Settings", "settings.profile": "Profile", "settings.username": "Username", "settings.email": "Email", "settings.firstName": "First name", "settings.lastName": "Last name",
  "settings.saved": "Profile saved.", "settings.save": "Save changes", "settings.loadingProfile": "Loading profile…", "settings.appearance": "Appearance and language",
  "settings.appearanceHint": "Your choice is saved in this browser.", "settings.privacy": "Privacy",
  "settings.privacyText": "Documents, collections, and conversations belong to your account, and search is always filtered by ownership on the server. In the self-hosted edition the AI models run on your organization's own server, so document text never leaves it.",
} as const;

export type MessageKey = keyof typeof en;

const fa: Record<MessageKey, string> = {
  "app.name": "داکیومایند",
  "nav.dashboard": "داشبورد", "nav.documents": "اسناد", "nav.collections": "مجموعه‌ها", "nav.chat": "گفت‌وگوی هوشمند", "nav.settings": "تنظیمات", "nav.signOut": "خروج از حساب",
  "prefs.theme": "تغییر حالت روز/شب", "prefs.light": "روز", "prefs.dark": "شب", "prefs.language": "تغییر زبان",
  "units.kb": "{value} کیلوبایت", "units.mb": "{value} مگابایت", "units.gb": "{value} گیگابایت",
  "common.error": "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.", "common.delete": "حذف", "common.loading": "در حال بارگذاری…", "common.viewAll": "مشاهده همه", "common.empty": "—",
  "status.READY": "آماده", "status.PROCESSING": "در حال پردازش", "status.UPLOADED": "در صف پردازش", "status.FAILED": "ناموفق",

  "login.eyebrow": "خوش برگشتید", "login.title": "اسناد شما، فهمیده‌شده.", "login.subtitle": "برای جست‌وجو و گفت‌وگو با پایگاه دانش خصوصی‌تان وارد شوید.",
  "login.username": "نام کاربری", "login.password": "رمز عبور", "login.submit": "ورود", "login.busy": "در حال ورود…", "login.noAccount": "حساب ندارید؟", "login.register": "ثبت‌نام کنید",
  "register.eyebrow": "شروع کنید", "register.title": "فضای کاری خود را بسازید.", "register.username": "نام کاربری (حروف لاتین)", "register.email": "ایمیل", "register.password": "رمز عبور (حداقل ۸ کاراکتر)", "register.confirm": "تکرار رمز عبور",
  "register.submit": "ساخت حساب", "register.busy": "در حال ساخت حساب…", "register.haveAccount": "قبلاً ثبت‌نام کرده‌اید؟", "register.login": "وارد شوید",

  "dashboard.eyebrow": "فضای کاری شما", "dashboard.greeting": "خوش آمدید", "dashboard.upload": "بارگذاری سند", "dashboard.newChat": "پرسیدن سؤال",
  "kpi.documents": "اسناد", "kpi.documentsHint": "{ready} سند آماده جست‌وجو", "kpi.storage": "پایگاه دانش", "kpi.storageHint": "{pages} صفحه · {words} واژه",
  "kpi.questions": "پرسش‌ها", "kpi.questionsHint": "در {conversations} گفت‌وگو", "kpi.answerRate": "نرخ پاسخ‌گویی", "kpi.answerRateHint": "{answered} از {total} پرسش از روی اسناد پاسخ داده شد",
  "dashboard.processing": "{count} سند در پس‌زمینه در حال پردازش است.",
  "dashboard.activity": "پرسش‌های ۱۴ روز اخیر", "dashboard.activityTotal": "{count} پرسش", "dashboard.activityEmpty": "هنوز پرسشی ثبت نشده است. با استفاده تیم از گفت‌وگو، فعالیت اینجا نمایش داده می‌شود.",
  "dashboard.tooltip": "{date}: {count} پرسش", "dashboard.showTable": "نمایش جدول", "dashboard.hideTable": "نمایش نمودار", "dashboard.colDate": "تاریخ", "dashboard.colQuestions": "پرسش‌ها",
  "dashboard.topDocs": "پرارجاع‌ترین اسناد", "dashboard.topDocsEmpty": "اسنادی که بیشتر به پرسش‌ها پاسخ می‌دهند اینجا نمایش داده می‌شوند.", "dashboard.citations": "{count} ارجاع",
  "dashboard.gaps": "خلأهای دانشی", "dashboard.gapsHint": "پرسش‌های اخیری که اسناد شما پاسخی برایشان نداشتند. افزودن اسناد مرتبط، دستیار را کامل‌تر می‌کند.", "dashboard.gapsEmpty": "پرسش بی‌پاسخی وجود ندارد. اسناد شما تاکنون همه پرسش‌ها را پوشش داده‌اند.",
  "dashboard.types": "انواع اسناد", "dashboard.recent": "اسناد اخیر", "dashboard.recentEmpty": "برای شروع، اولین سند خود را بارگذاری کنید.",

  "documents.eyebrow": "کتابخانه", "documents.title": "اسناد", "documents.subtitle": "اسناد در پس‌زمینه پردازش می‌شوند و فقط برای حساب شما قابل مشاهده‌اند.",
  "documents.upload": "بارگذاری سند", "documents.uploading": "در حال بارگذاری…", "documents.name": "نام", "documents.size": "حجم", "documents.status": "وضعیت", "documents.added": "تاریخ افزودن",
  "documents.empty": "کتابخانه شما آماده است.", "documents.emptyHint": "فایل PDF، Word، متنی یا Markdown بارگذاری کنید تا قابل جست‌وجو شود.", "documents.confirmDelete": "این سند و همه داده‌های استخراج‌شده از آن حذف شود؟",
  "documents.filter": "جست‌وجو در نام اسناد…",

  "document.back": "اسناد", "document.words": "{count} واژه", "document.pages": "{count} صفحه", "document.noPages": "بدون صفحه‌بندی", "document.failed": "پردازش این سند ناموفق بود. لطفاً دوباره بارگذاری کنید.",
  "document.summary": "خلاصه مستند", "document.summaryHint": "پس از پایان پردازش، خلاصه‌ای تهیه کنید که فقط بر محتوای همین سند تکیه دارد.", "document.generate": "تولید خلاصه", "document.generating": "در حال تولید…",
  "document.pending": "خلاصه این سند بزرگ در پس‌زمینه در حال تولید است. کمی بعد دوباره تلاش کنید.",
  "document.search": "جست‌وجو در این سند", "document.searchPlaceholder": "یک مفهوم یا پرسش را جست‌وجو کنید", "document.searchButton": "جست‌وجو", "document.noResults": "نتیجه مرتبطی پیدا نشد.",
  "document.page": "صفحه {page}", "document.whole": "سند", "document.match": "{value}٪ تطابق", "document.loading": "در حال بارگذاری سند…", "document.backToDocuments": "بازگشت به اسناد",
  "summary.short": "کوتاه", "summary.detailed": "مفصل", "summary.key_points": "نکات کلیدی", "summary.executive": "مدیریتی",

  "collections.eyebrow": "سازمان‌دهی", "collections.title": "مجموعه‌ها", "collections.subtitle": "اسناد مرتبط را برای جست‌وجو و پژوهش متمرکز دسته‌بندی کنید.",
  "collections.placeholder": "مثلاً: قراردادهای ۱۴۰۴", "collections.create": "ساخت مجموعه", "collections.count": "{count} سند", "collections.confirmDelete": "این مجموعه حذف شود؟ اسناد در کتابخانه باقی می‌مانند.",
  "collections.empty": "با مجموعه‌ها، پرسش‌های چندسندی ساده‌تر مدیریت می‌شوند.",

  "chat.eyebrow": "هوش مصنوعی مستند", "chat.title": "با پایگاه دانش خود گفت‌وگو کنید", "chat.new": "گفت‌وگوی جدید", "chat.conversations": "گفت‌وگوها", "chat.newTitle": "گفت‌وگوی جدید",
  "chat.emptyTitle": "هر پرسشی درباره اسناد خود دارید بپرسید.", "chat.emptyHint": "پاسخ‌ها همراه با منبع هستند و اگر شواهد کافی نباشد، صریحاً اعلام می‌شود. پرسش‌های بعدی هم زمینه گفت‌وگو را حفظ می‌کنند.",
  "chat.placeholder": "پرسش خود را بنویسید… (Enter برای ارسال، Shift+Enter برای خط جدید)", "chat.send": "ارسال", "chat.thinking": "در حال جست‌وجو در اسناد…", "chat.sources": "منابع", "chat.page": "صفحه {page}",
  "chat.copy": "کپی", "chat.copied": "کپی شد", "chat.suggestions": "پیشنهاد برای شروع",
  "chat.suggestion1": "تعهدات اصلی قراردادهای ما را خلاصه کن.", "chat.suggestion2": "هر کارمند چند روز مرخصی دارد؟", "chat.suggestion3": "چه مهلت‌ها یا تاریخ‌هایی در اسناد ذکر شده است؟",

  "settings.eyebrow": "حساب کاربری", "settings.title": "تنظیمات", "settings.profile": "نمایه", "settings.username": "نام کاربری", "settings.email": "ایمیل", "settings.firstName": "نام", "settings.lastName": "نام خانوادگی",
  "settings.saved": "نمایه ذخیره شد.", "settings.save": "ذخیره تغییرات", "settings.loadingProfile": "در حال بارگذاری نمایه…", "settings.appearance": "ظاهر و زبان",
  "settings.appearanceHint": "انتخاب شما در همین مرورگر ذخیره می‌شود.", "settings.privacy": "حریم خصوصی",
  "settings.privacyText": "اسناد، مجموعه‌ها و گفت‌وگوها متعلق به حساب شما هستند و جست‌وجو همیشه در سمت سرور بر اساس مالکیت محدود می‌شود. در نسخه خودمیزبان، مدل‌های هوش مصنوعی روی سرور سازمان شما اجرا می‌شوند و متن اسناد از آن خارج نمی‌شود.",
};

export const messages: Record<Locale, Record<MessageKey, string>> = { en, fa };
