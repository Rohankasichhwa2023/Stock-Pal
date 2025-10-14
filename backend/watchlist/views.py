from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import WatchlistItem
from .serializers import WatchlistItemSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_watchlist(request):
    user = request.user
    items = WatchlistItem.objects.filter(user=user).order_by('-added_at')
    serializer = WatchlistItemSerializer(items, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_watchlist(request):
    print("request.user:", request.user, type(request.user))
    print("HTTP_AUTHORIZATION:", request.META.get('HTTP_AUTHORIZATION'))

    user = request.user
    # from users.models import User
    # user = User.objects.get(username='rohankasichhwa')
    symbol = (request.data.get('symbol') or "").strip().upper()
    # symbol = (request.data.get('symbol') or "ADBL").strip().upper()
    if not symbol:
        return Response({'error': 'Symbol is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Prevent duplicates via get_or_create
    obj, created = WatchlistItem.objects.get_or_create(user=user, symbol=symbol)
    if not created:
        return Response({'message': 'Already in watchlist'}, status=status.HTTP_200_OK)

    serializer = WatchlistItemSerializer(obj)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_watchlist(request, symbol):
    user = request.user
    symbol = symbol.strip().upper()
    try:
        item = WatchlistItem.objects.get(user=user, symbol=symbol)
        item.delete()
        return Response({'message': 'Removed from watchlist'}, status=status.HTTP_200_OK)
    except WatchlistItem.DoesNotExist:
        return Response({'error': 'Not found in watchlist'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_watchlist(request, symbol):
    user = request.user
    symbol = symbol.strip().upper()
    exists = WatchlistItem.objects.filter(user=user, symbol=symbol).exists()
    return Response({'added': exists}, status=status.HTTP_200_OK)
