from django.db import models

class User(models.Model):
    username = models.CharField(max_length=100, unique=True)
    email = models.EmailField(max_length=100, unique=True)
    password = models.TextField()  # hashed password
    is_admin = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username

    # --- Minimal compatibility for Django/DRF auth checks ---
    @property
    def is_authenticated(self):
        # True for real user instances
        return True

    @property
    def is_anonymous(self):
        # False for real users (AnonymousUser class handles anonymous)
        return False

    # Optional, add if you later use permission helpers
    def has_perm(self, perm, obj=None):
        return self.is_admin

    def has_module_perms(self, app_label):
        return self.is_admin


