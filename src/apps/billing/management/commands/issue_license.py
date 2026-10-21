"""Vendor tool: create a signing key pair, or sign a license for a self-hosted customer.

    python src/manage.py issue_license --generate-keys
    python src/manage.py issue_license --private-key <key> --customer "Holding X" \
        --plan enterprise --seats 200 --expires 2027-03-20
"""

from __future__ import annotations

from datetime import date
from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from apps.billing.license import InvalidLicense, generate_keypair, issue


class Command(BaseCommand):
    help = "Generate license signing keys or issue a signed license."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--generate-keys", action="store_true")
        parser.add_argument("--private-key")
        parser.add_argument("--customer")
        parser.add_argument("--plan", default="enterprise")
        parser.add_argument("--seats", type=int)
        parser.add_argument("--expires", type=date.fromisoformat)

    def handle(self, *args: Any, **options: Any) -> None:
        if options["generate_keys"]:
            private, public = generate_keypair()
            self.stdout.write(f"DOCUMIND_LICENSE_PUBLIC_KEY={public}")
            self.stdout.write(f"PRIVATE KEY (keep secret, never ship it): {private}")
            return
        if not (options["private_key"] and options["customer"] and options["expires"]):
            raise CommandError("--private-key, --customer and --expires are required.")
        try:
            token = issue(
                options["private_key"],
                customer=options["customer"],
                plan=options["plan"],
                seats=options["seats"],
                expires=options["expires"],
            )
        except (InvalidLicense, ValueError) as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(f"DOCUMIND_LICENSE={token}")
