from django.urls import path

from .views import BillingView, CallbackView, CheckoutView, PlansView

urlpatterns = [
    path("", BillingView.as_view(), name="billing"),
    path("plans/", PlansView.as_view(), name="billing-plans"),
    path("checkout/", CheckoutView.as_view(), name="billing-checkout"),
    path("callback/", CallbackView.as_view(), name="billing-callback"),
]
