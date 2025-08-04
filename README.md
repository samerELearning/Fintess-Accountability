# Fitness Accountability Dashboard 🏋️‍♂️

**Stay accountable. Stay consistent. Push forward.**

This military-themed fitness web app helps users set weekly fitness goals (distance + reps), track their actual performance, and see how they and their team perform over time. If a user fails to meet their goal, their whole team feels it.

---

## 🚀 Features

- 🔐 **Anonymous Firebase Authentication**
- 🧍 **User Dashboard**
  - Set and submit weekly fitness goals
  - Log actual progress
  - View personal history and a performance curve
- 🧠 **MIA Detection**
  - Automatically flags missing weekly submissions
- 👥 **Team View**
  - See your teammates' progress
  - View average team performance over time
- 🌍 **Community Dashboard**
  - Explore user stats from across the platform
  - View global progress trends and team listings
- ⚙️ **Admin Panel**
  - Block/unblock and delete users
  - Create, edit, and delete teams
  - Access individual user and team profiles

---

## 🛠️ Tech Stack

- **Frontend:** React.js
- **Styling:** Pure CSS (military HUD style)
- **Backend:** Firebase (Firestore + Auth)
- **Data Visualization:** Recharts
- **Sound:** Intro screen typewriter sound effect

---

## 🖼️ Social Media Link Preview

To control how your link looks when shared, make sure these are in `public/index.html`:

```html
<meta property="og:title" content="Fitness Accountability" />
<meta property="og:description" content="Stay accountable with your fitness goals — track, log, and push yourself each week!" />
<meta property="og:image" content="%PUBLIC_URL%/DUT.png" />
<meta property="og:url" content="https://fitness-accountability.vercel.app/" />
<meta name="twitter:card" content="summary_large_image" />
```

✅ Recommended image size for previews: `1200x630`

---

## 🔧 Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/your-username/fitness-accountability.git
cd fitness-accountability
npm install
```

### 2. Add Firebase Configuration

Update your Firebase config inside `Dashboard.js` (or externalize it to a `.env` file).

### 3. Start Development Server

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

---

## 📦 Build for Production

```bash
npm run build
```

Then deploy the contents of the `/build` folder to your preferred host (e.g., Vercel, Firebase, Netlify).

---

## 👤 Admin Access

To unlock admin-only tools, manually add your Firebase UID to the `admins` collection in Firestore.

---

## 📄 License

MIT License © 2025
