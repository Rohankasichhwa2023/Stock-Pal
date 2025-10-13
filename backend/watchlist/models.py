from django.conf import settings
from django.db import models

# Use settings.AUTH_USER_MODEL so it will point to your custom users.User
UserModel = settings.AUTH_USER_MODEL

class WatchlistItem(models.Model):
    user = models.ForeignKey(UserModel, on_delete=models.CASCADE, related_name="watchlist_items")
    symbol = models.CharField(max_length=32)   # e.g. 'ADBL'
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'symbol')
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user} — {self.symbol}"
