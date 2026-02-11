# Frontend Setup & Running Instructions

##  What Was Created

### Components Folder Structure:
- components/
   ScheduleForm.js          (Form to add meetings & tasks)
   ResultsDisplay.js        (Display analysis results)
   HistoryPanel.js          (Show past analyses)
   Statistics.js            (Show usage stats)

### Main Files Updated:
- App.js                        (Main component with tab navigation)
- App.css                       (Complete styling)

##  Quick Start

### 1. Make sure you have Node.js installed
Check: node -v (should be v14+ or higher)

### 2. Install dependencies (first time only)
\\\ash
cd d:\Final_YearProject\personal-task-automation\frontend
npm install
\\\

### 3. Make sure Backend is Running
In another terminal:
\\\ash
cd d:\Final_YearProject\personal-task-automation\backend
uvicorn main:app --reload
\\\
Backend will run on: http://localhost:8000

### 4. Start Frontend
\\\ash
cd d:\Final_YearProject\personal-task-automation\frontend
npm start
\\\
Frontend will open at: http://localhost:3000

##  Features

 **Analyze Tab** - Add meetings and tasks, submit for AI analysis
 **Results Tab** - View all 5 agent outputs
 **History Tab** - See your last 10 analyses
 **Stats Tab** - View usage statistics
 **Modern UI** - Clean, responsive design
 **Error Handling** - Shows errors and loading states

##  How Frontend & Backend Connect

Frontend (React)  HTTP POST  Backend (FastAPI)
         
    Localhost:3000        Localhost:8000

All communication uses HTTP/JSON REST API

##  UI Layout


   Schedule Automation             
  AI-powered schedule analyzer       

  Analyze |  Results |  History |  Stats 

                                       
  [Active Tab Content]               
                                       


##  Troubleshooting

### Port 3000 already in use
\\\ash
netstat -ano | findstr :3000
taskkill /PID [PID] /F
npm start
\\\

### Port 8000 already in use
\\\ash
netstat -ano | findstr :8000
taskkill /PID [PID] /F
uvicorn main:app --reload
\\\

### CORS Error in Console
Make sure backend has CORS enabled (it should be in settings.py)

### \"Cannot find module\" errors
Run: npm install
