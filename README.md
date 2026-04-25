# 🚛 Trip Log Compliance System

A smart logistics compliance platform that helps truck drivers and fleet operators generate compliant trip logs based on route inputs, HOS rules, fuel stops, break timing, and trip planning automation.

---

## 📌 Features

- 📍 Route planning from current location to pickup/drop-off
- 🕒 Automatic trip log generation
- ⛽ Fuel stop planning based on distance rules
- 🛌 Driving / break / sleeper berth compliance handling
- 🗺️ Interactive map with route visualization
- 📊 Backend API for trip calculations

---

## 🛠️ Tech Stack

<p align="left">
  <img src="https://skillicons.dev/icons?i=react,typescript,python,django,docker,git,github,vite" />
</p>

---

## 🏗️ Architecture

```bash
Frontend (React + Vite)
        ↓
 REST API (Django REST Framework)
```

---

## 📂 Project Structure

```bash
trip-log-system/
│── client/         # React Frontend
│── server/         # Django + DRF Backend
│── README.md
```

---

## ⚙️ Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/trip-log-system.git
cd trip-log-system
```

### 2️⃣ Backend Setup

```bash
cd server
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3️⃣ Frontend Setup

```bash
cd client
npm install
npm run dev
```

---

## 🌐 Environment Variables

Create `.env` file in server:

```env
GEOAPIFY_API_KEY=**
DJANGO_SECRET_KEY=**
DEBUG=True
ALLOWED_HOSTS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:8000
CORS_ALLOWED_ORIGINS=http://localhost:8000
```

Create `.env` file in client:

```env
VITE_SERVER_SIDE_BASE_URL=http://localhost:8000/api
```

---

## 🚀 Future Improvements

- AI trip optimization
- Real-time GPS tracking
- Driver dashboard analytics

- Fleet multi-user management

---

## 👨‍💻 Author

**Bidyut Kr. Das**

Backend Engineer | Full Stack Developer | DevOps Enthusiast
