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

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "storages",
    "meditations",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
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
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
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
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "UNAUTHENTICATED_USER": None,
}

# No trailing slashes — match Flask URL behavior
APPEND_SLASH = False

# No CSRF for API-only backend
CSRF_COOKIE_SECURE = False

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

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
