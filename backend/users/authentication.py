# users/authentication.py
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from users.models import User

class CustomJWTAuthentication(JWTAuthentication):
    # Use the configured USER_ID_CLAIM from SIMPLE_JWT if present, otherwise default to 'user_id'
    user_id_claim = settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id')

    def get_user(self, validated_token):
        """
        Look up the user using our custom users.User model and the claim name defined above.
        """
        try:
            user_id = validated_token[self.user_id_claim]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found", code="user_not_found")

        return user
