"""The plan catalog. Limits and features live in code; prices come from settings."""

from __future__ import annotations

from dataclasses import dataclass, field

from django.conf import settings

# Feature flags a plan can unlock.
CONTRACT_RADAR = "contract_radar"
ADVANCED_SUMMARIES = "advanced_summaries"
KNOWLEDGE_GAPS = "knowledge_gaps"
ALL_FEATURES = frozenset({CONTRACT_RADAR, ADVANCED_SUMMARIES, KNOWLEDGE_GAPS})

UNLIMITED = None


@dataclass(frozen=True)
class Plan:
    code: str
    max_documents: int | None
    max_storage_mb: int | None
    monthly_questions: int | None
    seats: int | None
    features: frozenset[str] = field(default_factory=frozenset)
    purchasable: bool = True

    def price(self, interval: str) -> int | None:
        """Price in Toman, or None when the plan is not sold online."""
        prices: dict[str, dict[str, int]] = settings.BILLING_PRICES_TOMAN
        return prices.get(self.code, {}).get(interval)

    def has(self, feature: str) -> bool:
        return feature in self.features


FREE = Plan("free", 20, 50, 100, 1, purchasable=False)
PRO = Plan("pro", 1000, 5 * 1024, 5000, 10, ALL_FEATURES)
ENTERPRISE = Plan(
    "enterprise", UNLIMITED, UNLIMITED, UNLIMITED, UNLIMITED, ALL_FEATURES, purchasable=False
)
# New workspaces try Pro for a while so they meet the premium features before deciding.
TRIAL = PRO

PLANS = {plan.code: plan for plan in (FREE, PRO, ENTERPRISE)}
INTERVALS = ("monthly", "yearly")
