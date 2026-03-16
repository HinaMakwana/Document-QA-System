"""
User and Profile models for the accounts app.
"""
import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom User model with email-based authentication."""

    class Tier(models.TextChoices):
        FREE = 'free', 'Free'
        BASIC = 'basic', 'Basic'
        PREMIUM = 'premium', 'Premium'
        ENTERPRISE = 'enterprise', 'Enterprise'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # Remove username field
    email = models.EmailField('email address', unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)

    # Subscription and limits
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.FREE)
    daily_token_limit = models.IntegerField(default=100000)
    monthly_token_limit = models.IntegerField(default=3000000)
    max_documents = models.IntegerField(default=10)

    # Usage tracking
    tokens_used_today = models.IntegerField(default=0)
    tokens_used_month = models.IntegerField(default=0)
    last_token_reset_date = models.DateField(null=True, blank=True)
    last_month_reset_date = models.DateField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    def reset_daily_tokens(self):
        """Reset daily token count if needed."""
        today = timezone.now().date()
        if self.last_token_reset_date != today:
            self.tokens_used_today = 0
            self.last_token_reset_date = today
            self.save(update_fields=['tokens_used_today', 'last_token_reset_date'])

    def reset_monthly_tokens(self):
        """Reset monthly token count if needed."""
        today = timezone.now().date()
        if self.last_month_reset_date is None or self.last_month_reset_date.month != today.month:
            self.tokens_used_month = 0
            self.last_month_reset_date = today
            self.save(update_fields=['tokens_used_month', 'last_month_reset_date'])

    def add_token_usage(self, tokens):
        """Add token usage and check limits."""
        self.reset_daily_tokens()
        self.reset_monthly_tokens()

        self.tokens_used_today += tokens
        self.tokens_used_month += tokens
        self.save(update_fields=['tokens_used_today', 'tokens_used_month'])

    def can_use_tokens(self, tokens=0):
        """Check if user can use more tokens."""
        self.reset_daily_tokens()
        self.reset_monthly_tokens()

        return (
            self.tokens_used_today + tokens <= self.daily_token_limit and
            self.tokens_used_month + tokens <= self.monthly_token_limit
        )

    def get_tier_limits(self):
        """Get limits based on user tier."""
        tier_limits = {
            self.Tier.FREE: {
                'daily_tokens': 100000,
                'monthly_tokens': 3000000,
                'max_documents': 10,
                'max_file_size_mb': 5,
                'rate_limit': '100/hour',
            },
            self.Tier.BASIC: {
                'daily_tokens': 500000,
                'monthly_tokens': 15000000,
                'max_documents': 50,
                'max_file_size_mb': 10,
                'rate_limit': '500/hour',
            },
            self.Tier.PREMIUM: {
                'daily_tokens': 2000000,
                'monthly_tokens': 60000000,
                'max_documents': 200,
                'max_file_size_mb': 25,
                'rate_limit': '2000/hour',
            },
            self.Tier.ENTERPRISE: {
                'daily_tokens': 10000000,
                'monthly_tokens': 300000000,
                'max_documents': 1000,
                'max_file_size_mb': 50,
                'rate_limit': '10000/hour',
            },
        }
        return tier_limits.get(self.tier, tier_limits[self.Tier.FREE])


class UserAPIKey(models.Model):
    """API Keys for users to access the API programmatically."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=255)
    key_prefix = models.CharField(max_length=8)  # Store first 8 chars for identification
    key_hash = models.CharField(max_length=128)  # Store hashed key
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_api_keys'
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'

    def __str__(self):
        return f"{self.name} ({self.key_prefix}...)"


class RateLimitRecord(models.Model):
    """Track rate limiting for users."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rate_limits', null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    endpoint = models.CharField(max_length=200)
    request_count = models.IntegerField(default=0)
    window_start = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rate_limit_records'
        unique_together = [['user', 'endpoint', 'window_start']]

    def __str__(self):
        return f"{self.user or self.ip_address} - {self.endpoint} - {self.request_count}"
