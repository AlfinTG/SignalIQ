from __future__ import annotations

import json
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "signaliq.db"
_local = threading.local()


def get_db() -> sqlite3.Connection:
    if not hasattr(_local, "conn") or _local.conn is None:
        conn = sqlite3.connect(str(DB_PATH), timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        _local.conn = conn
    return _local.conn


def init_db() -> None:
    conn = get_db()
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                url TEXT,
                created_at TEXT NOT NULL
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS forms (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                fields TEXT NOT NULL,
                accent_color TEXT DEFAULT '#2563EB',
                submit_text TEXT DEFAULT 'Send Feedback',
                success_message TEXT DEFAULT 'Thank you for your feedback!',
                status TEXT DEFAULT 'draft',
                template TEXT DEFAULT 'general',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                form_id TEXT,
                text TEXT NOT NULL,
                rating REAL,
                source TEXT DEFAULT 'widget',
                sentiment TEXT DEFAULT 'unclassified',
                category TEXT DEFAULT 'Uncategorized',
                issue_key TEXT DEFAULT 'unclassified',
                severity TEXT DEFAULT 'unknown',
                confidence REAL,
                analysis_reason TEXT,
                suggested_action TEXT,
                analysis_mode TEXT DEFAULT 'unclassified',
                analysis_status TEXT DEFAULT 'pending',
                custom_data TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS action_items (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                issue_key TEXT NOT NULL,
                title TEXT NOT NULL,
                proposed_fix TEXT,
                assignee TEXT,
                due_date TEXT,
                status TEXT DEFAULT 'open',
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_forms_project ON forms(project_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_actions_project ON action_items(project_id);")

    _seed_default_data()


def _seed_default_data() -> None:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM projects")
    if cur.fetchone()["cnt"] > 0:
        return

    # Seed default project
    default_proj_id = "proj-default"
    default_form_id = "form-default"
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with conn:
        conn.execute(
            """
            INSERT INTO projects (id, workspace_id, name, url, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (default_proj_id, "default-workspace", "Acme Storefront", "https://store.acme.example", now_iso),
        )

        default_fields = [
            {"id": "category", "type": "category", "label": "Topic", "required": False, "options": ["Payments", "Delivery", "Product quality", "Customer service", "App performance", "Other"]},
            {"id": "text", "type": "textarea", "label": "What was your experience?", "required": True, "placeholder": "Tell us what happened or what we can improve..."},
            {"id": "rating", "type": "rating", "label": "Overall rating", "required": False},
            {"id": "email", "type": "email", "label": "Email (optional)", "required": False, "placeholder": "you@example.com"}
        ]

        conn.execute(
            """
            INSERT INTO forms (id, project_id, title, description, fields, accent_color, submit_text, success_message, status, template, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                default_form_id,
                default_proj_id,
                "Website & Purchase Feedback",
                "Help us improve your checkout and shopping experience.",
                json.dumps(default_fields),
                "#2563EB",
                "Send Feedback",
                "Thank you! Your feedback has been sent directly to our product team.",
                "published",
                "general",
                now_iso,
                now_iso,
            ),
        )

        # Seed initial sample feedback
        seed_records = [
            ("s01", "2026-08-12T12:00:00Z", "review", 2, "Checkout charged my card twice and then showed a payment failure. I had to email support to reverse the duplicate charge.", "negative", "Payments", "duplicate-checkout-charge", "high", 0.88, "Customer reports a failed checkout plus a duplicate charge.", "Audit the payment gateway for duplicate authorizations on retry.", "demo-rules", "analyzed"),
            ("s02", "2026-08-14T12:00:00Z", "widget", 1, "Apple Pay keeps failing on the last step. The spinner runs for a minute then says payment unsuccessful.", "negative", "Payments", "wallet-payment-failure", "high", 0.85, "Wallet checkout fails after a long spinner.", "Reproduce Apple Pay on iOS Safari and capture gateway error codes.", "demo-rules", "analyzed"),
            ("s03", "2026-08-18T12:00:00Z", "widget", 2, "I could not complete payment with my Visa debit. It worked on another site the same day.", "negative", "Payments", "card-authorization-failure", "high", 0.79, "Visa debit authorization failed during checkout.", "Review issuer decline codes for debit cards.", "demo-rules", "analyzed"),
            ("s04", "2026-08-22T12:00:00Z", "hosted", 1, "UPI payment hung after I approved it in the bank app. Order stayed in pending for hours.", "negative", "Payments", "upi-pending-hang", "high", 0.82, "UPI approval did not reconcile with order status.", "Check webhook latency between UPI provider and order service.", "demo-rules", "analyzed"),
            ("s05", "2026-09-02T12:00:00Z", "api", 1, "Tried three cards. All failed with a generic error. Guest checkout is unusable tonight.", "negative", "Payments", "card-authorization-failure", "high", 0.84, "Multiple cards failed with a generic error.", "Inspect tonight's payment error burst in gateway logs.", "demo-rules", "analyzed"),
            ("s06", "2026-09-10T12:00:00Z", "widget", 2, "Payment went through but the confirmation page was blank so I paid again. Now I have two orders.", "negative", "Payments", "duplicate-checkout-charge", "high", 0.89, "Blank confirmation led to a second payment.", "Make order confirmation resilient when the success page fails to render.", "demo-rules", "analyzed"),
            ("s07", "2026-09-18T12:00:00Z", "hosted", 3, "Saved cards sometimes take two attempts. Not always broken, but it is frustrating.", "negative", "Payments", "saved-card-retry", "medium", 0.72, "Saved-card payments often need a retry.", "Measure saved-card first-attempt success rate.", "demo-rules", "analyzed"),
            ("s08", "2026-09-28T12:00:00Z", "widget", 1, "Refund for the failed checkout still has not reached my account after nine days.", "negative", "Payments", "slow-refund", "high", 0.86, "Refund delayed after a failed checkout.", "Prioritize outstanding refunds older than five days.", "demo-rules", "analyzed"),
            ("s09", "2026-10-04T12:00:00Z", "widget", 1, "Net banking redirect never returned to the store. I am scared I was charged.", "negative", "Payments", "payment-redirect-drop", "high", 0.81, "Bank redirect dropped the customer before confirmation.", "Add a pending-payment recovery page after redirects.", "demo-rules", "analyzed"),
            ("s10", "2026-08-16T12:00:00Z", "widget", 2, "Order said 2-day delivery and arrived on day six with no tracking updates after dispatch.", "negative", "Delivery", "late-delivery", "high", 0.80, "Delivery missed the promised window and tracking stalled.", "Escalate carrier SLA on this lane and restore tracking pings.", "demo-rules", "analyzed"),
            ("s11", "2026-08-20T12:00:00Z", "widget", 1, "Courier marked delivered but nobody was home and the package is missing.", "negative", "Delivery", "false-delivered", "high", 0.90, "False delivered scan with a missing parcel.", "Open a carrier investigation and offer a replacement immediately.", "demo-rules", "analyzed"),
            ("s12", "2026-08-27T12:00:00Z", "hosted", 2, "Delivery window keeps slipping. I took a day off work for a slot that was cancelled at 8am.", "negative", "Delivery", "delivery-slot-changes", "medium", 0.75, "Delivery slot was cancelled the same morning.", "Notify customers earlier when a slot is at risk.", "demo-rules", "analyzed"),
            ("s13", "2026-09-05T12:00:00Z", "widget", 1, "Package was left in the rain. Box soaked, product damaged.", "negative", "Delivery", "poor-package-handling", "high", 0.88, "Parcel left exposed and arrived damaged.", "Review last-mile handling instructions for weather.", "demo-rules", "analyzed"),
            ("s14", "2026-09-12T12:00:00Z", "widget", 2, "Tracking number never activated. Support told me to wait another week.", "negative", "Delivery", "late-delivery", "medium", 0.74, "Inactive tracking and a slow support reply.", "Trigger tracking activation alerts at 24 hours.", "demo-rules", "analyzed"),
            ("s15", "2026-09-21T12:00:00Z", "widget", 2, "Wrong size shipped and the return label expired before the replacement arrived.", "negative", "Delivery", "wrong-item-shipped", "high", 0.83, "Wrong item plus an expired return label.", "Extend return windows when replacements are delayed.", "demo-rules", "analyzed"),
            ("s16", "2026-09-30T12:00:00Z", "widget", 3, "Delivery was a day late but the driver was polite and kept me updated by SMS.", "neutral", "Delivery", "late-delivery", "low", 0.70, "Slight delay offset by proactive SMS updates.", "Keep SMS updates; investigate the one-day miss.", "demo-rules", "analyzed"),
            ("s17", "2026-10-06T12:00:00Z", "widget", 1, "Still waiting. Estimated delivery was 2 October and it is now 6 October with no new scan.", "negative", "Delivery", "late-delivery", "high", 0.85, "Order is four days past the estimate with no scans.", "Proactively contact the customer and reship if needed.", "demo-rules", "analyzed"),
            ("s18", "2026-08-13T12:00:00Z", "widget", 2, "The fabric pilled after one wash even though the listing said machine washable.", "negative", "Product quality", "fabric-quality", "medium", 0.76, "Item degraded after a single wash.", "Review the wash-care claim against recent QC samples.", "demo-rules", "analyzed"),
            ("s19", "2026-08-25T12:00:00Z", "widget", 1, "Charger in the box was dead on arrival. Replacement took 12 days.", "negative", "Product quality", "doa-accessory", "high", 0.87, "Accessory arrived dead and replacement was slow.", "Tighten inbound QC for bundled chargers.", "demo-rules", "analyzed"),
            ("s20", "2026-09-03T12:00:00Z", "hosted", 2, "Colour is much darker than the photos. Looks cheap in person.", "negative", "Product quality", "listing-photo-mismatch", "medium", 0.73, "Received colour does not match listing photos.", "Reshoot the listing under daylight and indoor lighting.", "demo-rules", "analyzed"),
            ("s21", "2026-09-14T12:00:00Z", "widget", 1, "Zipper split on day three. This is the second jacket with the same fault.", "negative", "Product quality", "zipper-failure", "high", 0.89, "Repeat zipper failure on the same SKU.", "Pause the SKU and inspect the zipper supplier batch.", "demo-rules", "analyzed"),
            ("s22", "2026-09-24T12:00:00Z", "widget", 4, "Shoes are comfortable and look as advertised. Sizing was accurate.", "positive", "Product quality", "accurate-sizing", "low", 0.82, "Customer confirms comfort and accurate sizing.", "Keep current size chart for this style.", "demo-rules", "analyzed"),
            ("s23", "2026-10-01T12:00:00Z", "widget", 5, "The kettle is solid, heats quickly, and the finish matches the photos.", "positive", "Product quality", "product-meets-listing", "low", 0.88, "Product performance matches the listing.", "No quality action required for this SKU.", "demo-rules", "analyzed"),
            ("s24", "2026-08-15T12:00:00Z", "widget", 2, "Waited 40 minutes in chat. Agent then copied a help article I had already read.", "negative", "Customer service", "slow-support-response", "medium", 0.78, "Long wait and a generic canned reply.", "Review chat staffing at peak hours and ban unhelpful macros.", "demo-rules", "analyzed"),
            ("s25", "2026-08-28T12:00:00Z", "widget", 1, "Nobody called back about my damaged item even after I sent photos.", "negative", "Customer service", "missed-follow-up", "high", 0.85, "No follow-up on a documented damage claim.", "Create a same-day SLA for damage claims with photos.", "demo-rules", "analyzed"),
            ("s26", "2026-09-08T12:00:00Z", "widget", 3, "Support was polite but could not override the return fee even though the item was defective.", "neutral", "Customer service", "return-fee-policy", "medium", 0.71, "Agent lacked authority to waive a fee on a defect.", "Allow fee waivers for confirmed defects without escalation.", "demo-rules", "analyzed"),
            ("s27", "2026-09-19T12:00:00Z", "widget", 1, "Ticket closed automatically while I was still waiting for a replacement.", "negative", "Customer service", "premature-ticket-close", "medium", 0.77, "Ticket auto-closed before resolution.", "Disable auto-close when a replacement is still open.", "demo-rules", "analyzed"),
            ("s28", "2026-10-03T12:00:00Z", "widget", 5, "Priya on the evening chat team sorted my refund in one conversation. Excellent.", "positive", "Customer service", "effective-support", "low", 0.91, "Named agent resolved a refund quickly.", "Capture this handling as a coaching example.", "demo-rules", "analyzed"),
            ("s29", "2026-08-17T12:00:00Z", "widget", 1, "The app freezes on the payment screen. I had to restart twice to place the order.", "negative", "App performance", "checkout-freeze", "high", 0.87, "App freeze on the payment screen.", "Profile the checkout screen for main-thread stalls.", "demo-rules", "analyzed"),
            ("s30", "2026-08-24T12:00:00Z", "hosted", 2, "Search is slow and sometimes shows yesterday's prices.", "negative", "App performance", "stale-search-results", "medium", 0.75, "Search latency and stale prices.", "Check search cache TTLs against the price feed.", "demo-rules", "analyzed"),
            ("s31", "2026-09-06T12:00:00Z", "widget", 2, "Push notifications arrive hours late, including delivery alerts I needed the same morning.", "negative", "App performance", "late-push-notifications", "medium", 0.76, "Delivery alerts arrived hours late.", "Inspect the push dispatch queue for delays.", "demo-rules", "analyzed"),
            ("s32", "2026-09-16T12:00:00Z", "widget", 2, "Product photos take forever to load on 4G. The listing looks empty at first.", "negative", "App performance", "slow-image-load", "medium", 0.74, "Listing images load too slowly on mobile data.", "Serve compressed image variants for 4G clients.", "demo-rules", "analyzed"),
            ("s33", "2026-09-27T12:00:00Z", "widget", 4, "New home screen is cleaner. Wish the cart badge updated without killing the app.", "neutral", "App performance", "stale-cart-badge", "low", 0.72, "UI praise with a cart-badge refresh issue.", "Refresh the cart badge on resume.", "demo-rules", "analyzed"),
            ("s34", "2026-10-05T12:00:00Z", "widget", 1, "Crash when I apply a coupon on Android 14. Happens every time.", "negative", "App performance", "coupon-crash-android", "high", 0.92, "Reproducible crash applying coupons on Android 14.", "Patch coupon application on Android 14 before the next release.", "demo-rules", "analyzed"),
            ("s35", "2026-08-19T12:00:00Z", "widget", 5, "Order arrived a day early and the packaging was neat. Will buy again.", "positive", "Delivery", "early-delivery", "low", 0.89, "Early delivery and neat packaging.", "No action; keep this carrier assignment.", "demo-rules", "analyzed"),
            ("s36", "2026-08-30T12:00:00Z", "widget", 5, "Love the quality of the towels. Soft, thick, exactly as described.", "positive", "Product quality", "product-meets-listing", "low", 0.93, "Quality matched the listing.", "No quality action required.", "demo-rules", "analyzed"),
            ("s37", "2026-09-07T12:00:00Z", "widget", 4, "App is much faster after the last update. Browsing feels smooth.", "positive", "App performance", "improved-app-speed", "low", 0.85, "Customer noticed a speed improvement.", "Keep the recent performance work in the next release notes.", "demo-rules", "analyzed"),
            ("s38", "2026-09-15T12:00:00Z", "widget", 5, "Support replaced my cracked bottle without arguing. That is how it should work.", "positive", "Customer service", "effective-support", "low", 0.90, "Hassle-free replacement.", "Keep the no-argument replacement path for damaged goods.", "demo-rules", "analyzed"),
            ("s39", "2026-09-22T12:00:00Z", "widget", 4, "Checkout with UPI was instant this time. Previous month it failed twice.", "positive", "Payments", "upi-success", "low", 0.84, "UPI succeeded after earlier failures.", "Monitor UPI success so the improvement holds.", "demo-rules", "analyzed"),
            ("s40", "2026-09-29T12:00:00Z", "widget", 3, "The product is fine. Shipping was average. Nothing special, nothing terrible.", "neutral", "Delivery", "average-shipping", "low", 0.70, "Neutral comment with no defect.", "No action beyond routine monitoring.", "demo-rules", "analyzed"),
            ("s41", "2026-10-02T12:00:00Z", "widget", 3, "Size is okay but the smell of the packaging was strong for a day.", "neutral", "Product quality", "packaging-odour", "low", 0.71, "Temporary packaging odour, otherwise acceptable.", "Ask warehouse to air out this supplier's cartons.", "demo-rules", "analyzed"),
            ("s42", "2026-10-07T12:00:00Z", "widget", 3, "I just wanted to know if you restock the navy backpack. No complaint.", "neutral", "Customer service", "restock-question", "low", 0.73, "Restock question rather than a defect.", "Reply with restock date if known.", "demo-rules", "analyzed"),
            ("s43", "2026-09-09T12:00:00Z", "widget", 2, "Discount code from the email expired in the cart even though the email said it was valid today.", "negative", "Payments", "promo-code-mismatch", "medium", 0.77, "Promo code validity disagreed with the email.", "Sync email campaign end times with cart promo rules.", "demo-rules", "analyzed"),
            ("s44", "2026-09-11T12:00:00Z", "widget", 1, "Customer service told me to wait 5-7 days, then closed the chat. Parcel still missing.", "negative", "Customer service", "slow-support-response", "high", 0.88, "Chat closed while a parcel was still missing.", "Do not close missing-parcel chats without a tracking update.", "demo-rules", "analyzed"),
            ("s45", "2026-09-25T12:00:00Z", "widget", 2, "App logged me out during checkout and emptied the cart. Had to rebuild the order.", "negative", "App performance", "checkout-session-drop", "high", 0.86, "Session drop cleared the cart at checkout.", "Persist guest carts across auth refresh.", "demo-rules", "analyzed"),
            ("s46", "2026-08-21T12:00:00Z", "widget", 5, "Fast delivery to Pune and the sneakers look premium. Happy with the purchase.", "positive", "Delivery", "early-delivery", "low", 0.90, "Fast delivery and positive product impression.", "No action.", "demo-rules", "analyzed"),
            ("s47", "2026-10-08T12:00:00Z", "widget", 1, "Payment failed twice today with HDFC cards. Other banks worked. Please look into it.", "negative", "Payments", "card-authorization-failure", "high", 0.89, "Issuer-specific failures for HDFC cards.", "Check acquirer configuration for HDFC tonight.", "demo-rules", "analyzed"),
            ("s48", "2026-10-08T12:00:00Z", "widget", 4, "Customer service answered in four minutes and walked me through a size exchange.", "positive", "Customer service", "effective-support", "low", 0.88, "Fast, helpful size-exchange support.", "Keep current staffing for this window.", "demo-rules", "analyzed"),
        ]

        for s in seed_records:
            conn.execute(
                """
                INSERT INTO submissions (
                    id, project_id, form_id, text, rating, source, sentiment, category,
                    issue_key, severity, confidence, analysis_reason, suggested_action,
                    analysis_mode, analysis_status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (s[0], default_proj_id, default_form_id, s[4], s[3], s[2], s[5], s[6], s[7], s[8], s[9], s[10], s[11], s[12], s[13], s[1]),
            )

        # Seed initial action item
        conn.execute(
            """
            INSERT INTO action_items (id, project_id, issue_key, title, proposed_fix, assignee, due_date, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "act-1",
                default_proj_id,
                "duplicate-checkout-charge",
                "Idempotency Keys on Payment Gateway",
                "Implement idempotency key header on checkout retry button to prevent duplicate card capture.",
                "Alex Rivera (Backend Lead)",
                "2026-10-25",
                "in_progress",
                "Payment gateway logs show double authorizations within 15 seconds of retry.",
                now_iso,
                now_iso,
            ),
        )


# Helper query methods
def list_projects() -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    return dict(row) if row else None


def create_project(name: str, url: Optional[str] = None, workspace_id: str = "default-workspace") -> Dict[str, Any]:
    conn = get_db()
    proj_id = f"proj-{uuid.uuid4().hex[:8]}"
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with conn:
        conn.execute(
            "INSERT INTO projects (id, workspace_id, name, url, created_at) VALUES (?, ?, ?, ?, ?)",
            (proj_id, workspace_id, name, url or "", now_iso),
        )
    return get_project(proj_id)  # type: ignore


def list_forms(project_id: str) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM forms WHERE project_id = ? ORDER BY created_at DESC", (project_id,)).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["fields"] = json.loads(d["fields"]) if isinstance(d["fields"], str) else d["fields"]
        results.append(d)
    return results


def get_form(form_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute("SELECT * FROM forms WHERE id = ?", (form_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d["fields"] = json.loads(d["fields"]) if isinstance(d["fields"], str) else d["fields"]
    return d


def create_form(project_id: str, title: str, description: str, fields: List[Dict[str, Any]], accent_color: str = "#2563EB", submit_text: str = "Send Feedback", success_message: str = "Thank you for your feedback!", template: str = "general") -> Dict[str, Any]:
    conn = get_db()
    form_id = f"form-{uuid.uuid4().hex[:8]}"
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with conn:
        conn.execute(
            """
            INSERT INTO forms (id, project_id, title, description, fields, accent_color, submit_text, success_message, status, template, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
            """,
            (form_id, project_id, title, description, json.dumps(fields), accent_color, submit_text, success_message, template, now_iso, now_iso),
        )
    return get_form(form_id)  # type: ignore


def update_form(form_id: str, **kwargs: Any) -> Optional[Dict[str, Any]]:
    conn = get_db()
    existing = get_form(form_id)
    if not existing:
        return None
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    title = kwargs.get("title", existing["title"])
    description = kwargs.get("description", existing["description"])
    fields = kwargs.get("fields", existing["fields"])
    if isinstance(fields, (list, dict)):
        fields_json = json.dumps(fields)
    else:
        fields_json = fields
    accent_color = kwargs.get("accent_color", existing["accent_color"])
    submit_text = kwargs.get("submit_text", existing["submit_text"])
    success_message = kwargs.get("success_message", existing["success_message"])
    status = kwargs.get("status", existing["status"])
    template = kwargs.get("template", existing.get("template", "general"))

    with conn:
        conn.execute(
            """
            UPDATE forms
            SET title = ?, description = ?, fields = ?, accent_color = ?, submit_text = ?, success_message = ?, status = ?, template = ?, updated_at = ?
            WHERE id = ?
            """,
            (title, description, fields_json, accent_color, submit_text, success_message, status, template, now_iso, form_id),
        )
    return get_form(form_id)


def list_submissions(project_id: str) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM submissions WHERE project_id = ? ORDER BY created_at DESC", (project_id,)).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        if d.get("custom_data"):
            try:
                d["custom_data"] = json.loads(d["custom_data"])
            except Exception:
                pass
        results.append(d)
    return results


def insert_submission(
    project_id: str,
    text: str,
    rating: Optional[float] = None,
    form_id: Optional[str] = None,
    source: str = "widget",
    custom_data: Optional[Dict[str, Any]] = None,
    sentiment: str = "unclassified",
    category: str = "Uncategorized",
    issue_key: str = "unclassified",
    severity: str = "unknown",
    confidence: Optional[float] = None,
    analysis_reason: str = "",
    suggested_action: Optional[str] = None,
    analysis_mode: str = "unclassified",
    analysis_status: str = "pending",
    created_at: Optional[str] = None,
) -> Dict[str, Any]:
    conn = get_db()
    sub_id = f"sub-{uuid.uuid4().hex[:10]}"
    now_iso = created_at or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    custom_json = json.dumps(custom_data) if custom_data else None

    with conn:
        conn.execute(
            """
            INSERT INTO submissions (
                id, project_id, form_id, text, rating, source, sentiment, category,
                issue_key, severity, confidence, analysis_reason, suggested_action,
                analysis_mode, analysis_status, custom_data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sub_id, project_id, form_id, text, rating, source, sentiment, category,
                issue_key, severity, confidence, analysis_reason, suggested_action,
                analysis_mode, analysis_status, custom_json, now_iso
            ),
        )
    row = conn.execute("SELECT * FROM submissions WHERE id = ?", (sub_id,)).fetchone()
    d = dict(row)
    if d.get("custom_data"):
        try:
            d["custom_data"] = json.loads(d["custom_data"])
        except Exception:
            pass
    return d


def update_submission_analysis(
    submission_id: str,
    sentiment: str,
    category: str,
    issue_key: str,
    severity: str,
    confidence: Optional[float],
    analysis_reason: str,
    suggested_action: Optional[str],
    analysis_mode: str,
) -> None:
    conn = get_db()
    with conn:
        conn.execute(
            """
            UPDATE submissions
            SET sentiment = ?, category = ?, issue_key = ?, severity = ?,
                confidence = ?, analysis_reason = ?, suggested_action = ?,
                analysis_mode = ?, analysis_status = 'analyzed'
            WHERE id = ?
            """,
            (sentiment, category, issue_key, severity, confidence, analysis_reason, suggested_action, analysis_mode, submission_id),
        )


def list_actions(project_id: str) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM action_items WHERE project_id = ? ORDER BY created_at DESC", (project_id,)).fetchall()
    return [dict(r) for r in rows]


def create_action(
    project_id: str,
    issue_key: str,
    title: str,
    proposed_fix: Optional[str] = None,
    assignee: Optional[str] = None,
    due_date: Optional[str] = None,
    notes: Optional[str] = None,
    status: str = "open",
) -> Dict[str, Any]:
    conn = get_db()
    act_id = f"act-{uuid.uuid4().hex[:8]}"
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with conn:
        conn.execute(
            """
            INSERT INTO action_items (id, project_id, issue_key, title, proposed_fix, assignee, due_date, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (act_id, project_id, issue_key, title, proposed_fix, assignee, due_date, status, notes, now_iso, now_iso),
        )
    row = conn.execute("SELECT * FROM action_items WHERE id = ?", (act_id,)).fetchone()
    return dict(row)


def update_action(action_id: str, **kwargs: Any) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute("SELECT * FROM action_items WHERE id = ?", (action_id,)).fetchone()
    if not row:
        return None
    existing = dict(row)
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    title = kwargs.get("title", existing["title"])
    proposed_fix = kwargs.get("proposed_fix", existing["proposed_fix"])
    assignee = kwargs.get("assignee", existing["assignee"])
    due_date = kwargs.get("due_date", existing["due_date"])
    status = kwargs.get("status", existing["status"])
    notes = kwargs.get("notes", existing["notes"])

    with conn:
        conn.execute(
            """
            UPDATE action_items
            SET title = ?, proposed_fix = ?, assignee = ?, due_date = ?, status = ?, notes = ?, updated_at = ?
            WHERE id = ?
            """,
            (title, proposed_fix, assignee, due_date, status, notes, now_iso, action_id),
        )
    row2 = conn.execute("SELECT * FROM action_items WHERE id = ?", (action_id,)).fetchone()
    return dict(row2) if row2 else None
