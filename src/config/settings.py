"""Environment-driven Django settings for DocuMind."""

from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _load_dotenv(path: Path) -> None:
    """Read KEY=VALUE lines from .env for local runs; real environment variables win."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_dotenv(BASE_DIR / ".env")
# `production` turns on the hardening below and refuses to start with unsafe defaults.
PRODUCTION = os.getenv("DJANGO_ENV", "development") == "production"
DEV_SECRET_KEY = "unsafe-development-secret-change-me"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", DEV_SECRET_KEY)
DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost").split(",")]
if PRODUCTION and (SECRET_KEY == DEV_SECRET_KEY or len(SECRET_KEY) < 40 or DEBUG):
    raise ImproperlyConfigured(
        "Production needs DJANGO_DEBUG=false and a random DJANGO_SECRET_KEY of 40+ characters."
    )

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "apps.accounts",
    "apps.documents",
    "apps.collections",
    "apps.conversations",
    "apps.billing",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves collected static files (admin, API docs) without a separate web server.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.shared.middleware.RequestContextMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": os.getenv("DJANGO_DB_ENGINE", "django.db.backends.postgresql"),
        "NAME": os.getenv("POSTGRES_DB", "documind"),
        "USER": os.getenv("POSTGRES_USER", "documind"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "documind"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
# Persian by default so built-in Django/DRF validation messages reach users in Farsi.
LANGUAGE_CODE = os.getenv("DJANGO_LANGUAGE_CODE", "fa")
# The client sends Accept-Language from its language switch; these are the ones offered.
LANGUAGES = [("fa", "Persian"), ("en", "English")]
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage.CompressedManifestStaticFilesStorage"
            if PRODUCTION
            else "django.contrib.staticfiles.storage.StaticFilesStorage"
        )
    },
}
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 25,
    "EXCEPTION_HANDLER": "apps.shared.exceptions.api_exception_handler",
}
SPECTACULAR_SETTINGS = {
    "TITLE": "DocuMind API",
    "DESCRIPTION": "Document intelligence, semantic search, and grounded AI chat.",
    "VERSION": "v1",
    "SERVE_INCLUDE_SCHEMA": False,
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
SECURE_CONTENT_TYPE_NOSNIFF = True
if PRODUCTION:
    # Caddy terminates TLS and forwards the original scheme.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_SSL_REDIRECT = True
    # Container health checks call the app directly over HTTP.
    SECURE_REDIRECT_EXEMPT = [r"^health/$", r"^ready/$"]
    # HSTS preload is hard to undo for a domain; opting in is the owner's decision.
    SILENCED_SYSTEM_CHECKS = ["security.W021"]
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

CELERY_BROKER_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "false").lower() == "true"
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_TIME_LIMIT = 15 * 60
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
# Words per chunk. Smaller chunks let a specific clause match its question instead of being
# diluted by the rest of the document.
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "300"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "60"))
# `mock` (no AI, for development), `local` (self-hosted, OpenAI-compatible server such as
# Ollama), or `openai`.
AI_PROVIDER = os.getenv("AI_PROVIDER", "mock")
# The vector column size is fixed when migrations first run; changing it needs a fresh database.
EMBEDDING_DIMENSIONS = int(
    os.getenv("EMBEDDING_DIMENSIONS") or ("1024" if AI_PROVIDER == "local" else "1536")
)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
LOCAL_LLM_BASE_URL = os.getenv("LOCAL_LLM_BASE_URL", "http://localhost:11434/v1")
# Ollama ignores the key, but the OpenAI client requires a non-empty value.
LOCAL_LLM_API_KEY = os.getenv("LOCAL_LLM_API_KEY", "") or "not-needed"
LOCAL_CHAT_MODEL = os.getenv("LOCAL_CHAT_MODEL", "qwen2.5:7b")
LOCAL_EMBEDDING_MODEL = os.getenv("LOCAL_EMBEDDING_MODEL", "bge-m3")
LOCAL_LLM_TIMEOUT_SECONDS = float(os.getenv("LOCAL_LLM_TIMEOUT_SECONDS", "180"))
# Maximum cosine distance for a chunk to count as relevant. The mock embeddings are a sparse
# bag of words, so they need a much looser cut-off than real semantic embeddings.
# Loose on purpose: with bge-m3 a relevant clause can sit at 0.66 while an unrelated chunk sits
# at 0.50, so distance only gathers candidates and the model judges relevance (see rag.py).
SEMANTIC_SEARCH_MAX_DISTANCE = float(
    os.getenv("SEMANTIC_SEARCH_MAX_DISTANCE")
    or {"mock": "0.97", "local": "0.7"}.get(AI_PROVIDER, "0.65")
)
# Drop chunks more than this much further than the best match.
SEMANTIC_SEARCH_RELATIVE_MARGIN = float(
    os.getenv("SEMANTIC_SEARCH_RELATIVE_MARGIN") or ("1.0" if AI_PROVIDER == "mock" else "0.12")
)

# Billing. Prices are in Toman and are placeholders: set real ones in .env.
BILLING_TRIAL_DAYS = int(os.getenv("BILLING_TRIAL_DAYS", "14"))
BILLING_PRICES_TOMAN = {
    "pro": {
        "monthly": int(os.getenv("PRICE_PRO_MONTHLY_TOMAN", "3000000")),
        # Two months free on yearly billing.
        "yearly": int(os.getenv("PRICE_PRO_YEARLY_TOMAN", "30000000")),
    },
}
# `dev` simulates payments locally; `zarinpal` uses the real gateway (or its sandbox).
BILLING_GATEWAY = os.getenv("BILLING_GATEWAY", "dev")
ZARINPAL_MERCHANT_ID = os.getenv("ZARINPAL_MERCHANT_ID", "")
ZARINPAL_SANDBOX = os.getenv("ZARINPAL_SANDBOX", "true").lower() == "true"
BILLING_CALLBACK_URL = os.getenv(
    "BILLING_CALLBACK_URL", "http://localhost:8000/api/v1/billing/callback/"
)
FRONTEND_URL = os.getenv("FRONTEND_URL", CORS_ALLOWED_ORIGINS[0]).rstrip("/")
# Self-hosted installs: a signed license sets the plan and user seats for the whole install.
DOCUMIND_LICENSE = os.getenv("DOCUMIND_LICENSE", "")
DOCUMIND_LICENSE_PUBLIC_KEY = os.getenv("DOCUMIND_LICENSE_PUBLIC_KEY", "")

# Shared cache: throttling counters must be shared by every gunicorn worker, so production
# points this at Redis. Without it (development, tests) each process counts on its own.
CACHES = {
    "default": (
        {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": os.environ["CACHE_URL"],
        }
        if os.getenv("CACHE_URL")
        else {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    )
}

# Email for password resets. The console backend prints messages to the log for development.
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "false").lower() == "true"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "DocuMind <no-reply@localhost>")
PASSWORD_RESET_TIMEOUT = 60 * 60 * 3

# Rate limits. Login and account-recovery endpoints are tight to stop password guessing.
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = (
    "rest_framework.throttling.AnonRateThrottle",
    "rest_framework.throttling.UserRateThrottle",
    "rest_framework.throttling.ScopedRateThrottle",
)
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
    "anon": os.getenv("THROTTLE_ANON", "120/min"),
    "user": os.getenv("THROTTLE_USER", "600/min"),
    "login": os.getenv("THROTTLE_LOGIN", "10/min"),
    "register": os.getenv("THROTTLE_REGISTER", "10/hour"),
    "password_reset": os.getenv("THROTTLE_PASSWORD_RESET", "5/hour"),
}
