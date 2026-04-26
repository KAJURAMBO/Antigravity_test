import os
import json
import firebase_admin
from firebase_admin import credentials, messaging
from typing import List, Optional
from datetime import datetime

# Initialize Firebase Admin SDK
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(BASE_DIR, "service-account.json")

def initialize_firebase():
    """Initializes the Firebase app if not already initialized."""
    try:
        # Check if already initialized to avoid duplicate app error
        firebase_admin.get_app()
    except ValueError:
        # If not initialized, try to load from file or environment
        if os.path.exists(SERVICE_ACCOUNT_PATH):
            cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized from service-account.json")
        elif os.environ.get("FIREBASE_SERVICE_ACCOUNT"):
            # Useful for Render/Production environments
            cred_json = json.loads(os.environ.get("FIREBASE_SERVICE_ACCOUNT"))
            cred = credentials.Certificate(cred_json)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized from environment variable")
        else:
            print("WARNING: Firebase credentials not found. Notifications will be logged to console only.")

# Try to initialize immediately
initialize_firebase()

def send_push_notification(fcm_token: str, title: str, body: str, data: Optional[dict] = None):
    """
    Sends a push notification via Firebase Cloud Messaging (FCM).
    """
    if not fcm_token:
        return

    # Ensure data values are strings (required by FCM)
    formatted_data = {k: str(v) for k, v in (data or {}).items()}

    try:
        # Check if initialized
        firebase_admin.get_app()
        
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=formatted_data,
            token=fcm_token,
        )
        
        response = messaging.send(message)
        print(f"Successfully sent message: {response}")
        
    except Exception as e:
        print(f"--- [NOTIFICATION LOG FALLBACK] ---")
        print(f"To: {fcm_token}")
        print(f"Title: {title}")
        print(f"Body: {body}")
        print(f"Error/Reason: {e}")
        print(f"------------------------------------")

def notify_task_assigned(assignee_fcm_token: str, assigner_name: str, task_title: str, task_id: int, due_date: Optional[datetime]):
    """Triggered when someone delegates a task."""
    from datetime import timedelta
    
    # Adjust for IST (+5:30) for display purposes
    local_due = due_date + timedelta(hours=5, minutes=30) if due_date else None
    due_str = local_due.strftime("%I:%M %p") if local_due else "No deadline"
    
    title = "New Task Assigned! 📋"
    body = f"{assigner_name} assigned you: '{task_title}'. Due: {due_str}"
    
    send_push_notification(
        fcm_token=assignee_fcm_token,
        title=title,
        body=body,
        data={"type": "task_assigned", "task_title": task_title, "task_id": str(task_id)}
    )

def notify_daily_digest(fcm_token: str, today_count: Optional[int] = None, backlog_count: Optional[int] = None, future_count: Optional[int] = None, done_count: Optional[int] = None, active_tasks: Optional[List[str]] = None):
    """Triggered by the digest scheduler."""
    title = "Your Task Digest 📅"
    
    parts = []
    if today_count is not None:
        parts.append(f"Today: {today_count} tasks")
    if backlog_count is not None:
        parts.append(f"Backlog: {backlog_count} tasks")
    if future_count is not None:
        parts.append(f"Future: {future_count} tasks")
    if done_count is not None:
        parts.append(f"Done: {done_count} tasks")
        
    body = " | ".join(parts)
    if body:
        body += "."
    else:
        body = "You're all caught up! No task updates."
    
    if active_tasks:
        task_list = ", ".join(active_tasks[:5])
        if len(active_tasks) > 5:
            task_list += "..."
        body += f"\nActive: {task_list}"
        
    send_push_notification(
        fcm_token=fcm_token,
        title=title,
        body=body,
        data={"type": "daily_digest"}
    )
