import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent  # MeditationApp/

load_dotenv(PROJECT_ROOT / ".env")

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-0yv+!@=b3(qrh7-4s#4f-v3xew0#*mlikm=m5^o$%d39x1+_9e",
)

DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "storages",
    "meditations",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# CORS — allow frontend origins
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",") if o.strip()
]
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL", "false").lower() == "true"
CORS_ALLOW_CREDENTIALS = True

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
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --- Database: Supabase PostgreSQL ---

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": "aws-1-eu-central-1.pooler.supabase.com",
        "PORT": "5432",
        "NAME": "postgres",
        "USER": "postgres.ytxxmbbuhpmkwysoszzm",
        "PASSWORD": os.getenv("SUPABASE_DB_PASSWORD"),
        "OPTIONS": {
            "sslmode": "require",
        },
    }
}

# --- File Storage: Supabase Storage (S3-compatible) ---

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

AWS_S3_ENDPOINT_URL = f"{os.getenv('SUPABASE_URL')}/storage/v1/s3"
AWS_ACCESS_KEY_ID = os.getenv("SUPABASE_STORAGE_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.getenv("SUPABASE_STORAGE_SECRET_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("SUPABASE_STORAGE_BUCKET", "meditation-audio")
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = True

# --- Django REST Framework ---

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_AUTHENTICATION_CLASSES": ["meditations.authentication.TokenAuthentication"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "ai-chat": "30/hour",
        "ai-generation": "20/hour",
        "tts": "60/hour",
        "assembly": "60/hour",
    },
}

# No trailing slashes — match Flask URL behavior
APPEND_SLASH = False

# Session cookies — cross-origin support for production
SESSION_COOKIE_SAMESITE = "None" if not DEBUG else "Lax"
SESSION_COOKIE_SECURE = not DEBUG  # must be True when SameSite=None
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = not DEBUG

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# --- Email (SMTP) ---

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)
FEEDBACK_NOTIFY_EMAIL = os.getenv("FEEDBACK_NOTIFY_EMAIL", EMAIL_HOST_USER)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
