# Deploying Local Storage to AWS EC2

Since you are using **Local Filesystem Storage**, your media files will be stored directly on the EC2 instance's hard drive (EBS Volume). You do **NOT** need to change your code logic. You only need to configure the server environment correctly.

## 1. What Needs to Change? (Summary)

| **Component** | **Local (Current)** | **AWS EC2 (Production)** |
| :--- | :--- | :--- |
| **Code** | No Change | **No Change** |
| **Storage Location** | `d:\...\backend\uploads` | `/home/ubuntu/app/backend/uploads` |
| **BACKEND_URL (.env)** | `http://localhost:5001` | `http://<EC2-PUBLIC-IP>:5001` or `https://api.yourdomain.com` |

---

## 2. Step-by-Step Deployment Guide

### Step 1: Deploy Your Code
Push your code to the EC2 instance (via Git, etc.).

### Step 2: Create the Uploads Directory
On your EC2 terminal, ensure the directory exists and your application has permission to write to it.

```bash
cd /path/to/backend
# Create directory if it doesn't exist
mkdir -p uploads

# Give read/write permissions to the user running the app (usually ubuntu or ec2-user)
chmod -R 755 uploads
```

### Step 3: Update Environment Variables
On the EC2 instance, edit your `.env` file. This is the **most important step** to ensure links work.

```bash
nano .env
```

Change:
```env
# OLD (Local)
BACKEND_URL=http://localhost:5001

# NEW (EC2) - Use your Public IP or Domain
BACKEND_URL=http://YOUR_EC2_PUBLIC_IP:5001
# OR if using a domain (Recommended)
BACKEND_URL=https://api.yourdomain.com
```

### Step 4: Restart Your Server
Restart your Node.js application (using PM2 is recommended).

```bash
pm2 restart all
```

---

## 3. Important Considerations for AWS EC2

### ⚠️ Data Persistence (Crucial)
*   **The Issue**: Since files are stored on the server's disk, **if you terminate (delete) the EC2 instance, you LOSE your data.**
*   **The Solution**:
    1.  **Don't terminate**: Only "Stop" the instance if needed.
    2.  **Backups**: Regularly create **Snapshots** of your EBS Volume.
    3.  **Separate Volume**: Ideally, mount a separate EBS volume just for `/uploads` so implementation logic stays separate from data.

### ⚠️ Scaling Limits
*   **The Issue**: If you add a second server (Server B) to handle more traffic, it won't have the files uploaded to Server A.
*   **The Solution**: "Local Storage" makes scaling hard. If you plan to scale horizontally later, you will eventually need to migrate to **AWS S3**. But for a single EC2 instance, your current setup is perfectly fine.

### 🚀 Performance Tip (Nginx)
Don't let Node.js serve large video files in production. Use Nginx to serve the `uploads/` folder directly.

**Example Nginx Config Snippet (`/etc/nginx/sites-available/default`):**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Backend API Proxy
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Serve Uploads Directly (Much Faster for Video)
    location /uploads/ {
        alias /home/ubuntu/app/backend/uploads/;
        expires 30d;
        access_log off;
    }
}
```
