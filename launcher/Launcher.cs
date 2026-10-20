// ============================================================
//  Launcher.cs — 원클릭 실행기 (Windows)
//
//  빌드: npm run build:exe  (scripts/build-exe.mjs)
//   - Windows에 기본 포함된 .NET Framework 4.x 의 csc.exe 로 컴파일한다 (C# 5 문법만 사용!)
//   - dist/ 의 모든 파일이 exe 안에 리소스("game/<경로>")로 포함된다 → exe 하나로 배포
//
//  동작:
//   1) 127.0.0.1 (포트 후보 37615 → 38917 → 41234 → 임의) 에 아주 작은 정적 HTTP 서버를 띄운다
//      (루프백 전용 — 외부에서 접근 불가)
//   2) Edge(없으면 Chrome, 그것도 없으면 기본 브라우저)를 --app 모드(주소창 없는 창)로 연다
//      전용 프로필 폴더: %LOCALAPPDATA%\SurvivorsProto\browser-profile
//   3) 게임 페이지가 3초마다 /__launcher/ping 을 보내고, 창을 닫으면 /__launcher/bye 를 보낸다
//      (src/launcherBridge.ts) → 신호가 끊기면 서버를 정리하고 종료한다
//   4) 세이브 미러: 게임이 저장할 때마다 PUT /__launcher/save 로 디스크에도 기록한다
//      (%LOCALAPPDATA%\SurvivorsProto\save.json, 직전본은 save.json.bak)
//      → 포트가 바뀌어 브라우저 저장소(origin)가 달라져도 세이브가 이어진다
// ============================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace SurvivorsLauncher
{
    internal static class Program
    {
        // 앞에서부터 순서대로 시도한다. (일부 PC는 WSL/Hyper-V가 특정 대역을 막아 둔다)
        private static readonly int[] PortCandidates = { 37615, 38917, 41234, 0 };
        private const int MaxSaveBytes = 2 * 1024 * 1024;
        private const string AppId = "SurvivorsProto";
        private const string ResourcePrefix = "game/";

        private const int PingTimeoutSeconds = 150;  // 최소화된 창은 타이머가 분당 1회까지 느려질 수 있음
        private const int ByeGraceSeconds = 6;       // 새로고침이면 이 안에 다시 ping 이 온다
        private const int FirstPingTimeoutSeconds = 120;

        private static long lastPingTicks;
        private static long byeTicks;
        private static int everPinged;
        private static int serverPort;
        private static string savePath;
        private static readonly object SaveLock = new object();

        private static readonly Dictionary<string, byte[]> ResourceCache = new Dictionary<string, byte[]>();
        private static readonly object CacheLock = new object();

        [STAThread]
        private static int Main()
        {
            string dataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), AppId);
            string portFile = Path.Combine(dataDir, "launcher.port");
            string profileDir = Path.Combine(dataDir, "browser-profile");
            savePath = Path.Combine(dataDir, "save.json");

            try
            {
                Directory.CreateDirectory(dataDir);
            }
            catch (Exception ex)
            {
                ShowError("데이터 폴더를 만들 수 없습니다:\n" + dataDir + "\n\n" + ex.Message);
                return 1;
            }

            bool createdNew;
            using (Mutex mutex = new Mutex(true, "Local\\" + AppId + ".Launcher", out createdNew))
            {
                if (!createdNew)
                {
                    // 이미 실행 중이면 기존 서버로 창만 하나 더 연다.
                    int existingPort;
                    if (File.Exists(portFile) &&
                        int.TryParse(File.ReadAllText(portFile).Trim(), out existingPort))
                    {
                        OpenWindow(existingPort, profileDir);
                    }
                    return 0;
                }

                TcpListener listener = StartListener();
                if (listener == null)
                {
                    ShowError("로컬 게임 서버를 시작하지 못했습니다.");
                    return 1;
                }
                serverPort = ((IPEndPoint)listener.LocalEndpoint).Port;
                File.WriteAllText(portFile, serverPort.ToString());

                Thread serverThread = new Thread(delegate () { AcceptLoop(listener); });
                serverThread.IsBackground = true;
                serverThread.Start();

                if (!OpenWindow(serverPort, profileDir))
                {
                    listener.Stop();
                    return 1;
                }

                WaitUntilWindowClosed();

                listener.Stop();
                try { File.Delete(portFile); } catch (Exception) { }
            }
            return 0;
        }

        // ---------------------------------------------------------------- 창 열기

        private static bool OpenWindow(int port, string profileDir)
        {
            string url = "http://127.0.0.1:" + port + "/?launcher=1";
            string browser = FindChromiumBrowser();
            try
            {
                if (browser != null)
                {
                    Rectangle area = Screen.PrimaryScreen.WorkingArea;
                    int w = Math.Min(1120, (int)(area.Width * 0.92));
                    int h = Math.Min(920, (int)(area.Height * 0.92));
                    int x = area.Left + (area.Width - w) / 2;
                    int y = area.Top + (area.Height - h) / 2;
                    // --edge-skip-compat-layer-relaunch: Edge가 호환성 레이어로 다시 뜨며
                    // 일반 브라우저 창을 하나 더 만드는 동작을 막는다.
                    // user-data-dir 를 URL보다 앞에 둬야 이미 켜진 기본 브라우저로 주소가 넘어가지 않는다.
                    string args =
                        "--user-data-dir=\"" + profileDir + "\"" +
                        " --edge-skip-compat-layer-relaunch" +
                        " --no-first-run --no-default-browser-check --disable-sync" +
                        " --app=\"" + url + "\"" +
                        " --window-size=" + w + "," + h +
                        " --window-position=" + x + "," + y;
                    ProcessStartInfo psi = new ProcessStartInfo(browser, args);
                    psi.UseShellExecute = false;
                    Process proc = Process.Start(psi);
                    if (proc != null) WatchAndCloseStrayBrowserWindows(proc.Id);
                }
                else
                {
                    ProcessStartInfo psi = new ProcessStartInfo(url);
                    psi.UseShellExecute = true; // 기본 브라우저
                    Process.Start(psi);
                }
                return true;
            }
            catch (Exception ex)
            {
                ShowError("게임 창을 열지 못했습니다.\n브라우저에서 직접 열어 주세요: " + url + "\n\n" + ex.Message);
                return false;
            }
        }

        private static string FindChromiumBrowser()
        {
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] candidates =
            {
                Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(local, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
            };
            foreach (string c in candidates)
            {
                if (!string.IsNullOrEmpty(c) && File.Exists(c)) return c;
            }
            return null;
        }

        // Edge/Chrome --app 는 가끔 같은 프로세스에 주소창 있는 일반 창을 하나 더 연다.
        // 페이지 제목만 있는 게임 창은 두고, 브라우저 이름이 붙은 창만 닫는다.
        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hWnd);
        [DllImport("user32.dll")]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        [DllImport("user32.dll")]
        private static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

        private const uint WM_CLOSE = 0x0010;

        private static void WatchAndCloseStrayBrowserWindows(int browserPid)
        {
            Thread watcher = new Thread(delegate ()
            {
                for (int i = 0; i < 16; i++)
                {
                    Thread.Sleep(500);
                    try
                    {
                        CloseStrayBrowserWindows(browserPid);
                    }
                    catch (Exception)
                    {
                        // 창 열거 실패는 게임을 막지 않는다
                    }
                }
            });
            watcher.IsBackground = true;
            watcher.Start();
        }

        private static void CloseStrayBrowserWindows(int browserPid)
        {
            EnumWindows(delegate (IntPtr hWnd, IntPtr lParam)
            {
                if (!IsWindowVisible(hWnd)) return true;
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (pid != (uint)browserPid) return true;
                StringBuilder sb = new StringBuilder(512);
                if (GetWindowText(hWnd, sb, sb.Capacity) <= 0) return true;
                string title = sb.ToString();
                if (title.IndexOf("Survivors", StringComparison.OrdinalIgnoreCase) >= 0) return true;
                if (title.IndexOf("Edge", StringComparison.Ordinal) >= 0 ||
                    title.IndexOf("Chrome", StringComparison.Ordinal) >= 0)
                {
                    PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
                }
                return true;
            }, IntPtr.Zero);
        }

        // ---------------------------------------------------------------- 수명 관리

        private static void WaitUntilWindowClosed()
        {
            DateTime start = DateTime.UtcNow;
            while (true)
            {
                Thread.Sleep(500);
                long now = DateTime.UtcNow.Ticks;
                if (Interlocked.CompareExchange(ref everPinged, 0, 0) == 0)
                {
                    if ((DateTime.UtcNow - start).TotalSeconds > FirstPingTimeoutSeconds) return;
                    continue;
                }
                long ping = Interlocked.Read(ref lastPingTicks);
                long bye = Interlocked.Read(ref byeTicks);
                if (bye > ping && now - bye > TimeSpan.FromSeconds(ByeGraceSeconds).Ticks) return;
                if (now - ping > TimeSpan.FromSeconds(PingTimeoutSeconds).Ticks) return;
            }
        }

        // ---------------------------------------------------------------- HTTP 서버

        private static TcpListener StartListener()
        {
            foreach (int port in PortCandidates) // 0 = OS가 고르는 임의 포트
            {
                try
                {
                    TcpListener l = new TcpListener(IPAddress.Loopback, port);
                    l.Start();
                    return l;
                }
                catch (SocketException) { }
            }
            return null;
        }

        private static void AcceptLoop(TcpListener listener)
        {
            while (true)
            {
                TcpClient client;
                try { client = listener.AcceptTcpClient(); }
                catch (Exception) { return; }
                ThreadPool.QueueUserWorkItem(delegate (object _) { Handle(client); });
            }
        }

        private static void Handle(TcpClient client)
        {
            using (client)
            {
                try
                {
                    client.ReceiveTimeout = 5000;
                    client.SendTimeout = 5000;
                    NetworkStream stream = client.GetStream();

                    string head = ReadHead(stream);
                    if (head == null) return;
                    string[] lines = head.Split(new[] { "\r\n" }, StringSplitOptions.None);
                    string[] parts = lines[0].Split(' ');
                    if (parts.Length < 2) return;
                    string method = parts[0];
                    string target = parts[1];

                    string host = null;
                    int contentLength = 0;
                    for (int i = 1; i < lines.Length; i++)
                    {
                        int colon = lines[i].IndexOf(':');
                        if (colon <= 0) continue;
                        string key = lines[i].Substring(0, colon).Trim().ToLowerInvariant();
                        string value = lines[i].Substring(colon + 1).Trim();
                        if (key == "host") host = value;
                        else if (key == "content-length") int.TryParse(value, out contentLength);
                    }

                    // DNS rebinding 방지: 우리 주소로 온 요청만 받는다
                    if (host != "127.0.0.1:" + serverPort && host != "localhost:" + serverPort)
                    {
                        Respond(stream, 403, "Forbidden", "text/plain", Encoding.ASCII.GetBytes("forbidden"), false);
                        return;
                    }

                    string path = target;
                    int q = path.IndexOf('?');
                    if (q >= 0) path = path.Substring(0, q);
                    path = Uri.UnescapeDataString(path);

                    if (path == "/__launcher/save")
                    {
                        HandleSave(stream, method, contentLength);
                        return;
                    }

                    if (path.StartsWith("/__launcher/"))
                    {
                        Drain(stream, contentLength);
                        if (path == "/__launcher/ping")
                        {
                            Interlocked.Exchange(ref lastPingTicks, DateTime.UtcNow.Ticks);
                            Interlocked.Exchange(ref everPinged, 1);
                        }
                        else if (path == "/__launcher/bye")
                        {
                            Interlocked.Exchange(ref byeTicks, DateTime.UtcNow.Ticks);
                        }
                        Respond(stream, 204, "No Content", null, null, false);
                        return;
                    }

                    if (method != "GET" && method != "HEAD")
                    {
                        Respond(stream, 405, "Method Not Allowed", null, null, false);
                        return;
                    }

                    string name = path.TrimStart('/');
                    if (name.Length == 0) name = "index.html";
                    byte[] body = LoadResource(name);
                    if (body == null && Path.GetExtension(name).Length == 0)
                    {
                        name = "index.html"; // SPA fallback
                        body = LoadResource(name);
                    }
                    if (body == null)
                    {
                        Respond(stream, 404, "Not Found", "text/plain", Encoding.ASCII.GetBytes("not found"), method == "HEAD");
                        return;
                    }
                    Respond(stream, 200, "OK", ContentType(name), body, method == "HEAD");
                }
                catch (Exception)
                {
                    // 연결 끊김 등 — 무시
                }
            }
        }

        // ---------------------------------------------------------------- 세이브 미러

        private static void HandleSave(NetworkStream stream, string method, int contentLength)
        {
            if (method == "GET")
            {
                byte[] data = null;
                lock (SaveLock)
                {
                    if (File.Exists(savePath)) data = File.ReadAllBytes(savePath);
                }
                if (data == null || data.Length == 0) Respond(stream, 204, "No Content", null, null, false);
                else Respond(stream, 200, "OK", "application/json; charset=utf-8", data, false);
                return;
            }
            if (method == "PUT" || method == "POST")
            {
                if (contentLength <= 0 || contentLength > MaxSaveBytes)
                {
                    Drain(stream, contentLength);
                    Respond(stream, 413, "Payload Too Large", null, null, false);
                    return;
                }
                byte[] body = ReadBody(stream, contentLength);
                if (body == null || body.Length == 0 || body[0] != (byte)'{')
                {
                    Respond(stream, 400, "Bad Request", null, null, false);
                    return;
                }
                lock (SaveLock)
                {
                    string tmp = savePath + ".tmp";
                    File.WriteAllBytes(tmp, body);
                    if (File.Exists(savePath)) File.Replace(tmp, savePath, savePath + ".bak");
                    else File.Move(tmp, savePath);
                }
                Respond(stream, 204, "No Content", null, null, false);
                return;
            }
            Respond(stream, 405, "Method Not Allowed", null, null, false);
        }

        private static byte[] ReadBody(NetworkStream stream, int length)
        {
            byte[] body = new byte[length];
            int read = 0;
            while (read < length)
            {
                int n = stream.Read(body, read, length - read);
                if (n <= 0) return null;
                read += n;
            }
            return body;
        }

        private static string ReadHead(NetworkStream stream)
        {
            const int MaxHead = 16 * 1024;
            List<byte> buf = new List<byte>(1024);
            int matched = 0;
            byte[] end = { 13, 10, 13, 10 };
            while (buf.Count < MaxHead)
            {
                int b = stream.ReadByte();
                if (b < 0) return null;
                buf.Add((byte)b);
                matched = (b == end[matched]) ? matched + 1 : (b == 13 ? 1 : 0);
                if (matched == 4) return Encoding.ASCII.GetString(buf.ToArray(), 0, buf.Count - 4);
            }
            return null;
        }

        private static void Drain(NetworkStream stream, int length)
        {
            byte[] tmp = new byte[4096];
            int left = Math.Min(length, 64 * 1024);
            while (left > 0)
            {
                int n = stream.Read(tmp, 0, Math.Min(tmp.Length, left));
                if (n <= 0) break;
                left -= n;
            }
        }

        private static void Respond(NetworkStream s, int code, string reason, string type, byte[] body, bool headOnly)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("HTTP/1.1 ").Append(code).Append(' ').Append(reason).Append("\r\n");
            if (type != null) sb.Append("Content-Type: ").Append(type).Append("\r\n");
            sb.Append("Content-Length: ").Append(body == null ? 0 : body.Length).Append("\r\n");
            sb.Append("Cache-Control: no-cache\r\n");
            sb.Append("X-Content-Type-Options: nosniff\r\n");
            sb.Append("Connection: close\r\n\r\n");
            byte[] header = Encoding.ASCII.GetBytes(sb.ToString());
            s.Write(header, 0, header.Length);
            if (body != null && !headOnly) s.Write(body, 0, body.Length);
            s.Flush();
        }

        private static byte[] LoadResource(string name)
        {
            lock (CacheLock)
            {
                byte[] cached;
                if (ResourceCache.TryGetValue(name, out cached)) return cached;
                using (Stream rs = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourcePrefix + name))
                {
                    if (rs == null) return null;
                    using (MemoryStream ms = new MemoryStream())
                    {
                        rs.CopyTo(ms);
                        byte[] data = ms.ToArray();
                        ResourceCache[name] = data;
                        return data;
                    }
                }
            }
        }

        private static string ContentType(string name)
        {
            switch (Path.GetExtension(name).ToLowerInvariant())
            {
                case ".html": return "text/html; charset=utf-8";
                case ".js": return "text/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                case ".jpg":
                case ".jpeg": return "image/jpeg";
                case ".webp": return "image/webp";
                case ".gif": return "image/gif";
                case ".ico": return "image/x-icon";
                case ".woff2": return "font/woff2";
                case ".mp3": return "audio/mpeg";
                case ".ogg": return "audio/ogg";
                case ".wav": return "audio/wav";
                default: return "application/octet-stream";
            }
        }

        private static void ShowError(string message)
        {
            MessageBox.Show(message, "Survivors Prototype", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
