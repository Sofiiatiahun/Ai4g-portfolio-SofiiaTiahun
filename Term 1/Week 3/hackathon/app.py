import sys
import os
import json
import argparse
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from config import GEMINI_API_KEY, DEFAULT_MODEL, SERVER_HOST, SERVER_PORT
from gemini_client import call_gemini_api
from samples import SAMPLE_LABS
from guardrails import scan_critical_values, validate_input_relevance

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LabBridge — Equal Access Health Literacy (SDG 10)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        :root {
            --primary: #0284c7;
            --primary-dark: #0369a1;
            --secondary: #DD1367;
            --accent: #10b981;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --danger: #ef4444;
            --danger-bg: #fef2f2;
            --danger-border: #fecaca;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        body {
            background-color: var(--bg);
            color: var(--text-main);
            line-height: 1.6;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        header {
            background: white;
            border-bottom: 1px solid var(--border);
            padding: 1.25rem 2rem;
            position: sticky;
            top: 0;
            z-index: 50;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .brand-icon {
            background: linear-gradient(135deg, var(--secondary), #f43f5e);
            color: white;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.25rem;
            box-shadow: 0 4px 6px -1px rgba(221, 19, 103, 0.2);
        }

        .brand-title h1 {
            font-size: 1.35rem;
            font-weight: 700;
            color: #1e293b;
        }

        .brand-title p {
            font-size: 0.82rem;
            color: var(--text-muted);
        }

        .badges {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            flex-wrap: wrap;
        }

        .badge-sdg {
            background-color: #DD1367;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.35rem 0.75rem;
            border-radius: 9999px;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
        }

        .badge-ai {
            background-color: #e0f2fe;
            color: #0369a1;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.35rem 0.75rem;
            border-radius: 9999px;
        }

        main {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1.5rem;
            flex: 1;
            width: 100%;
        }

        .mission-banner {
            background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            padding: 1.25rem 1.5rem;
            margin-bottom: 2rem;
            display: flex;
            align-items: flex-start;
            gap: 1rem;
        }

        .mission-icon {
            font-size: 1.75rem;
            line-height: 1;
        }

        .mission-text h2 {
            font-size: 1.05rem;
            font-weight: 600;
            color: #166534;
            margin-bottom: 0.25rem;
        }

        .mission-text p {
            font-size: 0.9rem;
            color: #15803d;
        }

        .grid-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
        }

        @media (max-width: 900px) {
            .grid-layout {
                grid-template-columns: 1fr;
            }
        }

        .card {
            background: var(--card-bg);
            border-radius: 14px;
            border: 1px solid var(--border);
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
            padding: 1.75rem;
            display: flex;
            flex-direction: column;
        }

        .card-header {
            margin-bottom: 1.25rem;
        }

        .card-title {
            font-size: 1.15rem;
            font-weight: 600;
            color: #1e293b;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .card-subtitle {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        }

        .preset-buttons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
            margin-bottom: 1.25rem;
        }

        .btn-preset {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 0.5rem 0.75rem;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 500;
            color: #334155;
            cursor: pointer;
            text-align: left;
            transition: all 0.15s ease;
        }

        .btn-preset:hover {
            background: #e2e8f0;
            border-color: #94a3b8;
        }

        .btn-preset.danger-preset {
            border-color: #fca5a5;
            color: #991b1b;
            background: #fef2f2;
        }

        .btn-preset.danger-preset:hover {
            background: #fee2e2;
        }

        textarea {
            width: 100%;
            height: 220px;
            padding: 0.875rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.85rem;
            line-height: 1.4;
            resize: vertical;
            margin-bottom: 1rem;
            background-color: #fafafa;
        }

        textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
            background-color: #ffffff;
        }


        .btn-analyze {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: white;
            border: none;
            padding: 0.875rem 1.5rem;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.25);
        }

        .btn-analyze:hover {
            opacity: 0.95;
            transform: translateY(-1px);
        }

        .btn-analyze:disabled {
            background: #94a3b8;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .results-container {
            min-height: 400px;
            position: relative;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            text-align: center;
            color: var(--text-muted);
            height: 100%;
        }

        .empty-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.6;
        }

        .spinner {
            border: 3px solid rgba(2, 132, 199, 0.1);
            border-top: 3px solid var(--primary);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1rem;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .markdown-output {
            font-size: 0.92rem;
            line-height: 1.7;
            color: #334155;
        }

        .markdown-output h3 {
            font-size: 1.1rem;
            color: #0f172a;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            padding-bottom: 0.35rem;
            border-bottom: 1px solid var(--border);
        }

        .markdown-output ul {
            margin-left: 1.25rem;
            margin-bottom: 1rem;
        }

        .markdown-output li {
            margin-bottom: 0.5rem;
        }

        .markdown-output strong {
            color: #0f172a;
        }

        .alert-box {
            background-color: var(--danger-bg);
            border: 1px solid var(--danger-border);
            border-left: 4px solid var(--danger);
            border-radius: 8px;
            padding: 1rem 1.25rem;
            margin-bottom: 1.5rem;
            color: #991b1b;
        }

        .alert-box h4 {
            font-size: 0.95rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.35rem;
        }

        .source-pill {
            display: inline-block;
            font-size: 0.72rem;
            font-weight: 600;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            background: #e2e8f0;
            color: #475569;
            margin-bottom: 1rem;
        }

        .action-bar {
            display: flex;
            gap: 0.5rem;
            margin-top: 1.25rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
        }

        .btn-action {
            background: white;
            border: 1px solid var(--border);
            padding: 0.4rem 0.75rem;
            border-radius: 6px;
            font-size: 0.8rem;
            cursor: pointer;
            color: #475569;
            transition: all 0.15s;
        }

        .btn-action:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
        }

        footer {
            background: white;
            border-top: 1px solid var(--border);
            padding: 1.5rem 2rem;
            text-align: center;
            font-size: 0.82rem;
            color: var(--text-muted);
            margin-top: auto;
        }

        /* Clean layout without tabs */
    </style>
</head>
<body>
    <header>
        <div class="header-content">
            <div class="brand">
                <div class="brand-icon">LB</div>
                <div class="brand-title">
                    <h1>LabBridge</h1>
                    <p>Equal Access Health Literacy & Diagnostic Explainer</p>
                </div>
            </div>
            <div class="badges">
                <span class="badge-sdg">🎯 Equal Access for Patients</span>
            </div>
        </div>
    </header>

    <main>
        <div class="mission-banner">
            <div class="mission-icon">💡</div>
            <div class="mission-text">
                <h2>Understand Your Lab Results & Know Your Next Steps</h2>
                <p>Blood tests and lab numbers can be overwhelming, filled with medical jargon and confusing flags. LabBridge translates your test results into clear, everyday language, gives you prioritized questions to ask your doctor, and connects you with affordable community care options.</p>
            </div>
        </div>

        <div class="grid-layout">
            <!-- Input Column -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Patient Lab Report Input</h2>
                    <p class="card-subtitle">Choose a sample test below to test, or paste your own lab results.</p>
                </div>

                <div style="margin-bottom: 0.5rem; font-size: 0.78rem; font-weight: 600; color: #475569;">SAMPLE LAB TESTS:</div>
                <div class="preset-buttons">
                    <button class="btn-preset" onclick="loadSample('1')">🩸 1. CBC (Anemia & Iron)</button>
                    <button class="btn-preset" onclick="loadSample('2')">🧪 2. CMP (Glucose & Liver)</button>
                    <button class="btn-preset" onclick="loadSample('3')">❤️ 3. Lipid (Cholesterol)</button>
                    <button class="btn-preset danger-preset" onclick="loadSample('4')">🚨 4. Critical Alert Test</button>
                </div>

                <textarea id="labInput" placeholder="Paste complete lab results here (e.g., Hemoglobin 10.1 g/dL, Glucose 118 mg/dL, Potassium 4.4 mmol/L)..."></textarea>

                <button class="btn-analyze" id="analyzeBtn" onclick="runAnalysis()">
                    <span>Translate & Explain Lab Report</span> ➔
                </button>
            </div>

            <!-- Output Column -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">
                        <span>Plain-Language Patient Guide</span>
                        <span id="statusIndicator" style="font-size: 0.75rem; font-weight: 500;"></span>
                    </h2>
                    <p class="card-subtitle">Everyday explanation, doctor visit questions, and cost-saving care options.</p>
                </div>

                <div id="resultsContent" class="results-container">
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3 style="font-size: 1rem; color: #475569; margin-bottom: 0.5rem;">No Report Analyzed Yet</h3>
                        <p style="font-size: 0.85rem; max-width: 320px;">Click one of the sample buttons on the left or paste your blood test numbers, then click 'Translate & Explain'.</p>
                    </div>
                </div>

                <div class="action-bar" id="actionBar" style="display: none;">
                    <button class="btn-action" onclick="copyResult()">📋 Copy Text</button>
                    <button class="btn-action" onclick="window.print()">🖨️ Print for Doctor Visit</button>
                </div>
            </div>
        </div>
    </main>

    <footer>
        <p>LabBridge — Equal Access Health Literacy & Patient Empowerment Tool</p>
    </footer>

    <script>
        const samples = """ + json.dumps({k: v["text"] for k, v in SAMPLE_LABS.items()}) + """;

        function loadSample(key) {
            if (samples[key]) {
                document.getElementById('labInput').value = samples[key];
            }
        }

        async function runAnalysis() {
            const input = document.getElementById('labInput').value.trim();
            const analyzeBtn = document.getElementById('analyzeBtn');
            const resultsContent = document.getElementById('resultsContent');
            const statusIndicator = document.getElementById('statusIndicator');
            const actionBar = document.getElementById('actionBar');

            if (!input) {
                alert('Please paste lab test results or click one of the quick test presets.');
                return;
            }

            analyzeBtn.disabled = true;
            statusIndicator.innerHTML = '<span style="color: #0284c7;">Analyzing biomarkers...</span>';
            resultsContent.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Translating medical markers & preparing doctor guide...</p></div>';

            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: input
                    })
                });

                const data = await response.json();
                analyzeBtn.disabled = false;

                if (data.error) {
                    resultsContent.innerHTML = `<div class="alert-box"><h4>⚠️ Validation Issue</h4><p>${data.error}</p></div>`;
                    statusIndicator.innerHTML = '<span style="color: #ef4444;">Error</span>';
                    actionBar.style.display = 'none';
                    return;
                }

                statusIndicator.innerHTML = '<span class="source-pill" style="background:#dcfce7; color:#166534;">✓ Explanation Ready</span>';
                resultsContent.innerHTML = `<div class="markdown-output">${marked.parse(data.result)}</div>`;
                actionBar.style.display = 'flex';

            } catch (err) {
                analyzeBtn.disabled = false;
                statusIndicator.innerHTML = '<span style="color: #ef4444;">Connection failed</span>';
                resultsContent.innerHTML = `<div class="alert-box"><h4>⚠️ Request Error</h4><p>${err.message}</p></div>`;
                actionBar.style.display = 'none';
            }
        }

        function copyResult() {
            const resultsContent = document.getElementById('resultsContent');
            navigator.clipboard.writeText(resultsContent.innerText).then(() => {
                alert('Copied lab summary and doctor questions to clipboard!');
            });
        }
    </script>
</body>
</html>
"""

class LabBridgeHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/" or parsed.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))
        elif parsed.path in ["/favicon.ico", "/apple-touch-icon.png", "/apple-touch-icon-precomposed.png"]:
            self.send_response(204)
            self.end_headers()
        elif parsed.path == "/api/samples":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(SAMPLE_LABS).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/analyze":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length).decode("utf-8")
            try:
                payload = json.loads(post_data)
                text = payload.get("text", "")
                model = payload.get("model", DEFAULT_MODEL)
                api_key = payload.get("api_key", GEMINI_API_KEY)

                val_check = validate_input_relevance(text)
                if not val_check["valid"]:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": val_check["error"]}).encode("utf-8"))
                    return

                result_text, meta = call_gemini_api(text, api_key=api_key, model_name=model)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "result": result_text,
                    "meta": meta
                }).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

def run_cli(sample_id=None):
    print("=" * 70)
    print("  LabBridge — Equal Access Health Literacy & Diagnostic Explainer")
    print("  AI for Good — Hackathon 3 | SDG 10: Reduced Inequalities")
    print("=" * 70)
    
    if sample_id and sample_id in SAMPLE_LABS:
        chosen_sample = SAMPLE_LABS[sample_id]
        print(f"\n[+] Loading Preset: {chosen_sample['title']}")
        lab_text = chosen_sample["text"]
    else:
        print("\nAvailable Presets:")
        for k, v in SAMPLE_LABS.items():
            print(f"  [{k}] {v['title']}")
        print("  [C] Custom lab text paste")
        
        choice = input("\nSelect an option [1-4 or C, default 1]: ").strip().upper() or "1"
        if choice in SAMPLE_LABS:
            lab_text = SAMPLE_LABS[choice]["text"]
        else:
            print("\nPaste your lab report text below (Enter an empty line or EOF to finish):")
            lines = []
            while True:
                try:
                    line = input()
                    if not line and lines:
                        break
                    lines.append(line)
                except EOFError:
                    break
            lab_text = "\n".join(lines)
            
    print("\n" + "-" * 70)
    print("Analyzing lab biomarkers & generating patient guide...")
    print("-" * 70)
    
    result_text, meta = call_gemini_api(lab_text)
    
    print(f"\n[Analysis Status: {meta.get('status')} | Source: {meta.get('source')}]")
    if meta.get("model_used"):
        print(f"[Model Used: {meta.get('model_used')}]")
    print("\n" + result_text)
    print("\n" + "=" * 70)

def main():
    parser = argparse.ArgumentParser(description="LabBridge: Equal Access Health Literacy Explainer")
    parser.add_argument("--cli", action="store_true", help="Run in interactive CLI mode")
    parser.add_argument("--sample", type=str, choices=["1", "2", "3", "4"], help="Sample test preset ID (1-4)")
    parser.add_argument("--port", type=int, default=SERVER_PORT, help=f"Web server port (default: {SERVER_PORT})")
    parser.add_argument("--host", type=str, default=SERVER_HOST, help=f"Web server host (default: {SERVER_HOST})")
    
    args = parser.parse_args()
    
    if args.cli or args.sample:
        run_cli(args.sample)
    else:
        server_address = (args.host, args.port)
        httpd = HTTPServer(server_address, LabBridgeHandler)
        print("=" * 70)
        print("  LabBridge Web Application Running")
        print("  AI for Good — Hackathon 3 | SDG 10: Reduced Inequalities")
        print(f"  URL: http://{args.host}:{args.port}")
        print("  Press Ctrl+C to stop the server.")
        print("=" * 70)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()

if __name__ == "__main__":
    main()
