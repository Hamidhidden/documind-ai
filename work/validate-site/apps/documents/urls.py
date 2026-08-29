from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DocumentViewSet, SearchView

router = DefaultRouter()
router.register("documents", DocumentViewSet, basename="document")

urlpatterns = [path("search/", SearchView.as_view(), name="search"), path("", include(router.urls))]
