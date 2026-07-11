---
description: How to deploy MaintainIQ on AWS EC2
---

This workflow guides you through deploying the MaintainIQ platform (Frontend + Backend + Redis) on a single AWS EC2 Instance using Docker and Docker Compose.

## Prerequisites
1. **AWS Account**: An active AWS account.
2. **Domain (Optional but Recommended)**: A domain name pointed to your EC2 public IP for SSL setup.

---

### Step 1: Launch an AWS EC2 Instance
1. Go to AWS Console → **EC2 Dashboard** → **Launch Instance**.
2. **Name**: `MaintainIQ-Server`
3. **OS Image**: **Ubuntu 22.04 LTS** (Free Tier Eligible).
4. **Instance Type**: `t2.micro` or `t3.micro`.
5. **Key Pair**: Create or select an existing `.pem` key pair (Download and save it securely).
6. **Network Settings**:
   - Create security group.
   - Check **Allow SSH traffic from** (Anywhere or My IP).
   - Check **Allow HTTPS traffic from the internet**.
   - Check **Allow HTTP traffic from the internet**.
   - Add Custom TCP Rule: Port `5000` (for direct Backend API testing if you're not using Nginx reverse proxy, or keep it closed and route via Nginx).
7. Click **Launch Instance**.

---

### Step 2: Connect to Your Instance via SSH
Using your terminal (PowerShell, Bash, or Command Prompt):
```bash
chmod 400 your-key-pair.pem
ssh -i "your-key-pair.pem" ubuntu@<your-ec2-public-dns-or-ip>
```

---

### Step 3: Install Docker & Docker Compose on the Instance
Run these commands inside your EC2 terminal to set up Docker:

```bash
# Update local packages
sudo apt-get update -y

# Install Docker dependencies
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker’s official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

---

### Step 4: Clone Repository & Create `.env`
1. Clone your project repository onto the EC2 instance:
   ```bash
   git clone <your-git-repo-url> maintainiq
   cd maintainiq
   ```

2. Create the production environment file for the backend:
   ```bash
   nano backend/.env
   ```

3. Paste your production environment variables (with your real credentials):
   ```env
   PORT=5000
   NODE_ENV=production
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/MaintainIQ
   JWT_SECRET=<your-complex-jwt-security-key>
   JWT_EXPIRES_IN=7d

   CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
   CLOUDINARY_API_KEY=<your-cloudinary-key>
   CLOUDINARY_API_SECRET=<your-cloudinary-secret>

   GEMINI_API_KEY=<your-gemini-key>

   # We use local Docker redis container name
   REDIS_URL=redis://redis:6379

   # Public domain/ip where visitors view the frontend
   FRONTEND_URL=http://<your-ec2-public-ip-or-domain>

   # Mail configurations
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=<your-email@gmail.com>
   SMTP_PASS=<your-gmail-app-password>
   SMTP_FROM=MaintainIQ <noreply@maintainiq.com>

   DEFAULT_ADMIN_EMAIL=admin@maintainiq.com
   DEFAULT_ADMIN_PASSWORD=AdminPassword123!
   ```

---

### Step 5: Update Frontend API Host for Production
If you are deploying with Nginx serving the Frontend built statically:
1. Open `docker-compose.yml` to specify your public API url.
2. In the `frontend:` service definition, specify the build argument matching your public IP or DNS:
   ```yaml
   args:
     - VITE_API_URL=http://<your-ec2-public-ip-or-domain>:5000/api
   ```
   *(Note: Remember to configure Security Group to allow inbound traffic on Port 5000 if not proxying).*

---

### Step 6: Power Up docker-compose
To compile the Docker containers and start the background services:
```bash
docker compose up -d --build
```

To view running containers status:
```bash
docker compose ps
```

To inspect server logs if something isn't running correctly:
```bash
docker compose logs -f backend
```
