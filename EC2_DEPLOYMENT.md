# Deploying to AWS EC2

This guide will help you deploy your Next.js portfolio to AWS EC2.

## Prerequisites

- AWS Account
- EC2 instance created (Ubuntu 22.04 LTS or Amazon Linux 2023 recommended)
- SSH access to your EC2 instance
- Node.js 20.x LTS (will be installed by script)

## Step 1: Create EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Amazon Linux 2023** or **Ubuntu 22.04 LTS**
3. Instance type: **t2.micro** (free tier) or **t3.small** (recommended)
4. Configure security group:
   - **Port 22 (SSH)** - Your IP
   - **Port 3000 (HTTP)** - 0.0.0.0/0 (or your IP for testing)
   - **Port 80 (HTTP)** - 0.0.0.0/0 (if using reverse proxy)
   - **Port 443 (HTTPS)** - 0.0.0.0/0 (if using SSL)

5. Launch instance and save your key pair (.pem file)

## Step 2: Connect to EC2

```bash
# Make key file executable
chmod 400 your-key.pem

# Connect to EC2
ssh -i your-key.pem ec2-user@your-ec2-ip-address
```

## Step 3: Deploy the Application

### Option A: Automated Script (Recommended)

1. Upload the deployment script to EC2:
```bash
# From your local machine
scp -i your-key.pem ec2-deploy.sh ec2-user@your-ec2-ip:~/
```

2. On EC2, run:
```bash
chmod +x ec2-deploy.sh
./ec2-deploy.sh
```

### Option B: Manual Steps

```bash
# 1. Install Node.js 20.x LTS
# For Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# For Amazon Linux/RHEL/CentOS:
# curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
# sudo yum install -y nodejs

# 2. Install PM2 (process manager)
sudo npm install -g pm2

# 3. Clone your repository
git clone https://github.com/hatish2001/AIPortfolio.git
cd AIPortfolio

# 4. Install dependencies
npm install --legacy-peer-deps

# 5. Create .env file with your API keys
nano .env
# Add:
# OPENAI_API_KEY=your-key
# PINECONE_API_KEY=your-key (optional)
# PINECONE_INDEX_NAME=portfolio-chatbot (optional)

# 6. Build the application
npm run build

# 7. Start with PM2
pm2 start npm --name "portfolio" -- start
pm2 save
pm2 startup
```

## Step 4: Configure Firewall (Security Group)

Make sure your EC2 Security Group allows:
- **Port 3000** for Next.js app
- **Port 80/443** if using reverse proxy

## Step 5: Set Up Reverse Proxy (Optional but Recommended)

### Using Nginx:

```bash
# Install Nginx
sudo yum install -y nginx

# Create Nginx config
sudo nano /etc/nginx/conf.d/portfolio.conf
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 6: Set Up SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Step 7: Update Your Environment Variables

Don't forget to set your API keys in the `.env` file on EC2:

```bash
nano .env
```

Add:
```
OPENAI_API_KEY=your-actual-key
PINECONE_API_KEY=your-actual-key (if using Pinecone)
PINECONE_INDEX_NAME=portfolio-chatbot (if using Pinecone)
NEXT_PUBLIC_APP_URL=http://your-ec2-ip:3000
```

Then restart:
```bash
pm2 restart portfolio
```

## Useful Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs portfolio

# Restart application
pm2 restart portfolio

# Stop application
pm2 stop portfolio

# Monitor resources
pm2 monit
```

## Troubleshooting

### Port 3000 not accessible
- Check Security Group rules
- Verify PM2 is running: `pm2 status`
- Check if port is listening: `netstat -tulpn | grep 3000`

### Application crashes
- Check logs: `pm2 logs portfolio`
- Verify `.env` file has correct API keys
- Check Node.js version: `node --version` (should be 20.x)

### Build fails
- Check Node.js version
- Try: `rm -rf node_modules package-lock.json && npm install`

## Cost Considerations

- **t2.micro**: Free tier eligible, suitable for testing
- **t3.small**: ~$15/month, better performance
- **Data transfer**: First 1GB free, then $0.09/GB
- **Storage**: 8GB free on free tier

## Next Steps

1. Set up a domain name (Route 53 or external)
2. Configure CloudWatch for monitoring
3. Set up automated backups
4. Consider using AWS Elastic Beanstalk or ECS for easier management

