from django.conf import settings
from django.db import models
from users.models import User 

class WatchlistItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="watchlist_items")
    symbol = models.CharField(max_length=32) 
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'symbol')
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user} — {self.symbol}"
