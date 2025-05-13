import subprocess
import os
import sys
import time
import signal
import threading
import re
import webbrowser
try:
    from pyfiglet import Figlet
except ImportError:
    print("Installing pyfiglet...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyfiglet"])
    from pyfiglet import Figlet

try:
    from termcolor import colored
except ImportError:
    print("Installing termcolor...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "termcolor"])
    from termcolor import colored

try:
    import colorama
except ImportError:
    print("Installing colorama...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "colorama"])
    import colorama

# Initialize colorama for Windows support
colorama.init()

# Global flag to indicate shutdown
is_shutting_down = False
# Dictionary to store URLs
service_urls = {
    "AI Backend": None,
    "Node.js Server": None,
    "Frontend": None
}

def display_banner():
    """Display a custom banner using pyfiglet."""
    try:
        print("\n")
        f = Figlet(font='slant')
        title_text = f.renderText('GCN')
        print(colored(title_text, 'green', attrs=['bold']))
        print(colored(" "*10 + "Global Compliance Navigator" + " "*10, 'cyan', attrs=['bold']))
        print("\n" + colored("="*60, 'yellow') + "\n")
    except Exception as e:
        print("Banner display error:", e)
        print("\n" + colored("======= GCN: Global Compliance Navigator =======", 'cyan', attrs=['bold']) + "\n")

def run_command(command, cwd=None, shell=True, service_name=None, completion_marker=None, timeout=60, color='white'):
    """
    Run a command and capture its output.
    If completion_marker is provided, wait until that pattern appears in the output.
    """
    print(colored(f"Starting {service_name if service_name else command}...", 'cyan'))
    
    process = subprocess.Popen(
        command,
        cwd=cwd,
        shell=shell,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Create a thread to read output and detect completion marker and URLs
    ready_event = threading.Event()
    
    def read_output():
        prefix = colored(f"[{service_name}] ", color, attrs=['bold']) if service_name else colored(f"[{command.split()[-1] if not isinstance(command, list) else command[-1]}] ", color, attrs=['bold'])
        for line in iter(process.stdout.readline, ''):
            if not is_shutting_down:
                print(f"{prefix}{line.strip()}")
                
                # Check for completion marker
                if completion_marker and re.search(completion_marker, line):
                    ready_event.set()
                
                # Look for URLs in the output
                if service_name in service_urls:
                    # Look for localhost URLs
                    url_match = re.search(r'https?://localhost:[0-9]+', line)
                    if url_match:
                        service_urls[service_name] = url_match.group(0)
    
    thread = threading.Thread(target=read_output)
    thread.daemon = True
    thread.start()
    
    # If a completion marker is provided, wait for it to appear
    if completion_marker:
        start_time = time.time()
        while not ready_event.is_set() and time.time() - start_time < timeout:
            if process.poll() is not None:  # Process exited
                break
            time.sleep(0.1)
            
        if not ready_event.is_set():
            print(colored(f"Warning: {service_name} did not report readiness within {timeout} seconds.", 'yellow'))
            print(colored(f"Continuing anyway, but services may not be fully initialized.", 'yellow'))
        else:
            print(colored(f"{service_name} is ready.", 'green', attrs=['bold']))
    
    return process

def signal_handler(sig, frame):
    """Handle Ctrl+C to gracefully shut down all processes."""
    global is_shutting_down
    is_shutting_down = True
    print("\n" + colored("Shutting down all services...", 'red', attrs=['bold']))
    for p in running_processes:
        if p.poll() is None:  # If process is still running
            try:
                # Try graceful termination first
                if sys.platform == "win32":
                    p.terminate()
                else:
                    p.send_signal(signal.SIGTERM)
            except Exception:
                pass
    
    print(colored("All services have been stopped.", 'green'))
    sys.exit(0)

def display_service_urls():
    """Display URLs for all the services."""
    print("\n" + colored("="*60, 'yellow'))
    print(colored(" "*20 + "SERVICE INFORMATION" + " "*20, 'cyan', attrs=['bold']))
    print(colored("="*60, 'yellow'))
    
    for service, url in service_urls.items():
        if url:
            print(f"{colored(service, 'cyan')}: {colored(url, 'green', attrs=['underline'])}")
        else:
            print(f"{colored(service, 'cyan')}: {colored('URL not detected', 'red')}")
    
    print("\n" + colored("Access the application through the Frontend URL", 'green', attrs=['bold']))
    print(colored("="*60, 'yellow') + "\n")

def open_browser(url="http://localhost:5173/"):
    """Open the frontend URL in the default browser."""
    print(colored(f"Opening {url} in your default browser...", 'cyan'))
    try:
        webbrowser.open(url)
        print(colored("Browser opened successfully!", 'green'))
    except Exception as e:
        print(colored(f"Failed to open browser: {e}", 'red'))
        print(colored(f"Please manually navigate to {url}", 'yellow'))

if __name__ == "__main__":
    # Display banner
    display_banner()
    
    # Register signal handler for Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)
    
    # Get the absolute paths for the directories
    script_dir = os.path.dirname(os.path.abspath(__file__))
    new_ai_backend_dir = os.path.join(script_dir, "new_ai_backend")
    backend_dir = os.path.join(script_dir, "backend")
    frontend_dir = os.path.join(script_dir, "frontend")
    
    running_processes = []
    
    # Step 1: Start PostgreSQL in WSL
    print("\n" + colored("=== STEP 1: Starting PostgreSQL database ===", 'blue', attrs=['bold']))
    wsl_process = run_command("wsl sudo service postgresql start", service_name="PostgreSQL", color='magenta')
    running_processes.append(wsl_process)
    print(colored("Waiting for PostgreSQL to initialize...", 'cyan'))
    time.sleep(5)  # Give PostgreSQL time to start
    
    # Step 2: Start Python backend (main.py)
    print("\n" + colored("=== STEP 2: Starting Python AI backend ===", 'blue', attrs=['bold']))
    python_cmd = "python" if sys.platform == "win32" else "python3"
    py_backend_process = run_command(
        f"{python_cmd} main.py", 
        cwd=new_ai_backend_dir, 
        service_name="AI Backend",
        completion_marker=r"Uvicorn running on http://0\.0\.0\.0:8000",
        color='green'
    )
    running_processes.append(py_backend_process)
    
    # Step 3: Start Node.js backend server
    print("\n" + colored("=== STEP 3: Starting Node.js backend server ===", 'blue', attrs=['bold']))
    node_process = run_command(
        "node server.js", 
        cwd=backend_dir, 
        service_name="Node.js Server",
        completion_marker=r"Server running on port 5000",
        color='yellow'
    )
    running_processes.append(node_process)
    
    # Step 4: Start frontend dev server
    print("\n" + colored("=== STEP 4: Starting frontend development server ===", 'blue', attrs=['bold']))
    npm_process = run_command(
        "npm run dev", 
        cwd=frontend_dir, 
        service_name="Frontend",
        completion_marker=r"(ready in|Local:|development server running at|localhost:)",
        color='cyan'
    )
    running_processes.append(npm_process)
    
    # Display all service URLs
    time.sleep(3)  # Give some time for URLs to be detected
    display_service_urls()
    
    # Open the frontend URL in the default browser
    open_browser("http://localhost:5173/")
    
    print("\n" + colored("All services have been started! Press Ctrl+C to stop all services.", 'green', attrs=['bold']) + "\n")
    
    # Keep the script running
    try:
        while True:
            time.sleep(1)
            # Check if any process has terminated unexpectedly
            for i, (process, name) in enumerate(zip(running_processes, ["PostgreSQL", "AI Backend", "Node.js Server", "Frontend"])):
                if process.poll() is not None:
                    # Process has terminated
                    print("\n" + colored(f"{name} has stopped unexpectedly with exit code {process.poll()}.", 'red', attrs=['bold']))
                    if not is_shutting_down:
                        print(colored("You may need to restart the application.", 'yellow'))
                        is_shutting_down = True
                        signal_handler(None, None)
    except KeyboardInterrupt:
        signal_handler(None, None)