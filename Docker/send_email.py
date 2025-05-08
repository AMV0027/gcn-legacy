import smtplib
import sys
from email.mime.text import MIMEText

def send_email(ngrok_url):
    sender_email = "bytebuddies.assemble@gmail.com"
    receiver_email = "harisudhanvarma@gmail.com"
    password = "orhr jvxs bgcz spra"

    subject = "LocalTunnel Access URL for Web Terminal"
    body = f"Here is your LocalTunnel Access URL: {ngrok_url}"

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = receiver_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, password)
            server.sendmail(sender_email, receiver_email, msg.as_string())
            print("Email sent successfully!")
    except Exception as e:
        print(f"Failed to send email: {e}")

if __name__ == "__main__":
    ngrok_url = sys.argv[1]