# Karobar Hisab - Backend API

Production-ready Express.js and MongoDB backend for **Karobar Hisab** (Customer Credit & Payment Accounting).

---

## 🚀 Deploying to Vercel (Step-by-Step)

### 1. Set up MongoDB Atlas (Production Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in (or create a free account).
2. Create a free shared cluster (**M0 Free Tier**):
   - Provider: AWS (choose a nearby region like `ap-south-1` Mumbai or `eu-central-1` Frankfurt).
   - Cluster Name: `KarobarHisab`.
3. Under **Database Access**:
   - Create a database user (e.g. username: `karobar_admin`).
   - Create a strong password (save it safely).
4. Under **Network Access**:
   - Click **Add IP Address**.
   - Select **Allow Access From Anywhere** (`0.0.0.0/0`). This is necessary because Vercel uses dynamic serverless IP pools.
5. Get Connection String:
   - Click **Database** -> **Connect** -> **Drivers (Node.js)**.
   - Copy connection string: `mongodb+srv://karobar_admin:<password>@cluster0.xxxxx.mongodb.net/karobar_hisab?retryWrites=true&w=majority`.
   - Replace `<password>` with your database password.

---

### 2. Push Backend to GitHub
Open PowerShell in the project directory:
```powershell
# From d:\app\backend
git init
git add .
git commit -m "Karobar Hisab production backend"
# Create a new private repo on GitHub (e.g. karobar-hisab-backend)
git remote add origin https://github.com/<your-username>/karobar-hisab-backend.git
git branch -M main
git push -u origin main
```

---

### 3. Deploy on Vercel
1. Go to [Vercel](https://vercel.com) and log in with GitHub.
2. Click **Add New** -> **Project**.
3. Import your `karobar-hisab-backend` repository.
4. In **Project Settings**:
   - **Framework Preset**: Other (default)
   - **Root Directory**: `./` (leave default)
5. Expand **Environment Variables** and add:
   - `MONGODB_URI` = your Atlas connection string from step 1
   - `JWT_SECRET` = any random secure 32+ character string
   - `NODE_ENV` = `production`
6. Click **Deploy**.
7. In ~60 seconds, Vercel gives you a public URL (e.g., `https://karobar-hisab-backend.vercel.app`).
8. **Verify deployment**:
   Open `https://karobar-hisab-backend.vercel.app/api/health` in your browser.
   It should return:
   ```json
   {
     "status": "ok",
     "message": "Karobar Hisab backend is live and operational"
   }
   ```
