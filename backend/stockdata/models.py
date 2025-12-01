# stocks/models.py
from django.db import models

class Company(models.Model):
    symbol = models.CharField(max_length=32, unique=True, db_index=True)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    sector = models.CharField(max_length=128, blank=True, null=True)
    logo = models.CharField(max_length=1024, blank=True, null=True)  # store path or URL
    metadata = models.JSONField(blank=True, null=True)  # future-proof: store any extra fields

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["symbol"]
        verbose_name = "Company"
        verbose_name_plural = "Companies"

    def __str__(self):
        return f"{self.symbol} — {self.full_name or ''}"
