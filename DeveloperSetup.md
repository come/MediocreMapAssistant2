# Developer Setup

The MediocreMapAssistant2 uses the Unreal Engine 4 for it's development.

## Windows Developer Setup Instructions
### Visual Studio and Build Tools
* Install Visual Studio Community Edition
* Install Visual Studio component MSVC v140 - VS 2015 C++ build tools (v14.00)
* Install Windows SDK v8.1

### Install Unreal Engine 4
* Download and install the Epic Games launcher
* Install Unreal Engine from Epic Games Launcher, select the version which is indicated in "MediocreMapAssistant2.uproject" file
* Install the required plugins "VaRest" and "LE Extended Standard Library" into the engine (if you skip this step the editor will guide you through this when opening the project)

### Load and run the project
* Clone the project from github into your local development folder (this step requires git)
* Start the Unreal Enginge from the Epic Games Launcher
* browse for the existing project and open "MediocreMapAssistant2.uproject" from the github project folder
* upon the first start the editor likely wants to rebuild your project
* for starting the application you can click "Play"

### Errors
* A first starting point for errors are the logs in "Saved\Logs"
