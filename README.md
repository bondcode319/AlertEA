👥 Team
RoleResponsibility
CEO Product vision, narrative, submission
PM/Tech LeadAgent architecture, Azure deployment

📜 License
MIT License — see LICENSE

🙏 Acknowledgements

Microsoft AI Dev Days team
Brian Tumuhimbise
Benjamin Muwazi
Humphery Kibenge
James Kibalama



Full Project Description

THE PROBLEM

Every rainy season, flash floods devastate communities across East 
Africa. In Kampala alone, thousands of residents in low-lying areas 
like the Nakivubo wetlands and Lubigi basin receive little to no 
warning before flooding occurs. The result: lost lives, destroyed 
livelihoods, and overwhelmed emergency services. Across the region, 
1.4 billion people remain chronically underserved by modern disaster 
early warning infrastructure.

THE SOLUTION

AlertEA is a production-ready, multi-agent AI disaster early warning 
system built on Microsoft's AI platform. It continuously monitors 
real-time data streams — weather, seismic activity, and historical 
flood patterns — across five major East African cities, computes 
composite risk scores per zone, and dispatches SMS alerts directly 
to registered mobile subscribers on Airtel and MTN networks the 
moment a threat is detected.

The system operates as five coordinated AI agents:

1. WeatherAgent — Polls OpenWeatherMap API for live rainfall, wind, 
   and humidity readings across all monitored zones.

2. SeismicAgent — Monitors the USGS real-time earthquake feed for 
   seismic activity within 500km of each city.

3. FloodRiskAgent — Combines live rainfall data with terrain 
   vulnerability scores derived from UNOSAT flood maps and Uganda 
   OPM disaster reports to compute zone-level flood risk.

4. OrchestratorAgent — Powered by Microsoft Foundry, aggregates 
   signals from all three specialist agents into a weighted composite 
   risk score (0–10) and classifies threat level as LOW, MEDIUM, 
   HIGH, or CRITICAL.

5. AlertDispatchAgent — Triggers SMS alerts via Azure Communication 
   Services to all registered subscribers in at-risk zones the moment 
   risk scores cross defined thresholds.

HERO TECHNOLOGIES

AlertEA is built end-to-end on Microsoft's AI platform:

- Microsoft Agent Framework orchestrates all five agents with clear 
  role separation and parallel data collection.

- Microsoft Foundry manages the OrchestratorAgent's risk 
  classification model, enabling fine-tuned threat assessment based 
  on regional disaster history.

- Azure Communication Services powers the carrier-agnostic SMS 
  dispatch layer, with direct integration pathways to Airtel Uganda 
  and MTN Uganda.

- Azure App Service hosts the FastAPI backend, with the React 
  dashboard served via Azure Static Web Apps.

- Azure Maps renders the live East Africa threat map on the 
  dashboard, showing real-time risk zones color-coded from green 
  to critical red.

- GitHub Copilot in VS Code accelerated the development of all five 
  agent modules, the REST API, and the React dashboard across the 
  full 5-week build.

REAL-WORLD IMPACT

AlertEA targets a genuine, life-threatening gap in disaster 
preparedness infrastructure across East Africa. The platform is 
designed for immediate adoption by:

- National meteorological agencies (e.g. Uganda National 
  Meteorological Authority)
- Disaster management bodies (e.g. Uganda OPM, Kenya Red Cross)
- Mobile network operators as a value-added public safety service
- UN agencies including OCHA and UNICEF operating in the region

A 30-minute early warning SMS is the difference between evacuation 
and tragedy. AlertEA delivers that warning at scale, at near-zero 
marginal cost per alert.

WHAT WE BUILT

- 5-agent Python backend (Microsoft Agent Framework)
- FastAPI REST API deployed on Azure App Service
- React dashboard with live East Africa threat map (Azure Maps)
- SMS alert dispatch via Azure Communication Services
- Full public GitHub repository with architecture documentation
- Demonstrated end-to-end scenario: Kampala flash flood → 
  CRITICAL risk score 8.7 → SMS dispatched to 847 subscribers 
  in under 5 seconds

PHASE 2 ROADMAP

- Direct Airtel Uganda and MTN Uganda carrier API integration
- Expansion to 50 East African cities
- Landslide and wildfire agent modules
- Community incident reporting (crowdsourced validation layer)
- Government dashboard portal with OCHA data integration


Technologies Used
Microsoft Agent Framework, Microsoft Foundry, Azure Communication 
Services, Azure App Service, Azure Static Web Apps, Azure Maps, 
GitHub Copilot, VS Code, Python, FastAPI, React, OpenWeatherMap API, 
USGS Earthquake API, GDACS