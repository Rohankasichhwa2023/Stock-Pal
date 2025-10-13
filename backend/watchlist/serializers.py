from rest_framework import serializers
from .models import WatchlistItem

class WatchlistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchlistItem
        fields = ['id', 'symbol', 'added_at']
        read_only_fields = ['id', 'added_at']
