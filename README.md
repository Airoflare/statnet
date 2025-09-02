# StatNet

StatNet is an ultra-lightweight real-time monitoring app with a simple web interface. It’s designed to be fast, minimal, and efficient.

Built as a fully static site using Next.js and powered by a Go backend.

<br />

## Screenshots

<details>
<summary><strong>Click to view</strong></summary>

<table>
  <tr>
    <td align="center">
      <img src="/images/light-1.png" alt="Light Mode 1" width="400" /><br/>
      Light Mode
    </td>
    <td align="center">
      <img src="/images/dark-1.png" alt="Dark Mode 1" width="400" /><br/>
      Dark Mode
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="/images/light-2.png" alt="Light Mode 2" width="400" /><br/>
      Light Mode
    </td>
    <td align="center">
      <img src="/images/dark-2.png" alt="Dark Mode 2" width="400" /><br/>
      Dark Mode
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="/images/light-3.png" alt="Light Mode 3" width="400" /><br/>
      Light Mode
    </td>
    <td align="center">
      <img src="/images/dark-3.png" alt="Dark Mode 3" width="400" /><br/>
      Dark Mode
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="/images/light-4.png" alt="Light Mode 4" width="400" /><br/>
      Light Mode
    </td>
    <td align="center">
      <img src="/images/dark-4.png" alt="Dark Mode 4" width="400" /><br/>
      Dark Mode
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="/images/light-5.png" alt="Light Mode 5" width="400" /><br/>
      Light Mode
    </td>
    <td align="center">
      <img src="/images/dark-5.png" alt="Dark Mode 5" width="400" /><br/>
      Dark Mode
    </td>
  </tr>
</table>
</details>

<br />

## Features
*   **Host System Stats:** Displays CPU, memory, network, and disk usage of the host system.
*   **Container Stats:** Monitors all containers on the host, showing stats like CPU, memory, network, disk, and uptime (including offline containers).
*   **Custom Container Name Mappings:** Allows you to customize container names in the web interface for easier identification.
*   **Coolify Stats:** Tracks CPU, memory, network, and disk usage for Coolify containers.
*   **Responsive Design:** Optimized for both mobile and desktop views.
*   **Extremly Lightweight:** The app’s final Docker image is under 18MB, using less than 15MB of memory and under 1% CPU usage (single-core) during runtime.


<br />

## How It Works

StatNet uses [Next.js](https://nextjs.org) for the static frontend and a Go backend server to serve the site and gather system stats. 

The Go backend pulls data via the Docker API and reads the `/proc` directory on the host system for performance metrics. 

It can also read Coolify directories and volumes to fetch disk usage stats for Coolify containers.

<br />

## Why I Built This

I couldn't find a lightweight, real-time monitoring app with a clean web interface that met my needs, so I decided to build my own.

I made it open source so anyone can customize it and use it for their own setups.

<br />

## How I Use It

I’ve deployed StatNet on my home server via Coolify, on a custom internal domain that's only accessible on my local network. 

I use the web interface to quickly check the performance of my server and containers, including their resource usage.

<br />

## How to Deploy

You can deploy StatNet using the provided Docker Compose file or through Coolify.

### **Deploy Using Docker Compose**

1. Create a `compose.yaml` file on your server and paste the contents of the `docker-compose.yaml` from this repo.
2. Create a `container-names.json` file based on the `container-names-sample.json` in this repo, and update the file path in the Compose file.
3. Run `docker compose up` to launch the containers.

### **Deploy Using Coolify**

1. Create a `container-names.json` file based on the `container-names-sample.json` in this repo, and update the file path in the Compose file.
2. Add a new resource in Coolify → "Docker Compose Empty."
3. Paste the contents of the `coolify.yaml` from the repo into the input field.
4. Click "Deploy!"

<br />

## ⚠️ Limitations

- **No Database**
  - All data is served in real-time to the web interface—there is no historical data stored, and no database is used.

- **Single Server**
  - StatNet only monitors a single server at a time. To monitor multiple servers, you’ll need to deploy StatNet on each one individually.

<br />

## Known Issues + Fixes
**Error message:**
```
Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: open /proc/sys/net/ipv4/ip_unprivileged_port_start: read-only file system: unknown
```

**Explanation and Fix:**

This error typically occurs on `amd64` processors. The solution is to modify the mount configuration in your Docker Compose file:

* **Original mount:**

  ```
  - '/proc:/proc:ro'
  ```

* **Updated mount (remove read-only flag):**

  ```
  - '/proc:/proc'
  ```

**Reason:**
On `amd64` processors, Docker sometimes needs write access to `/proc` to adjust kernel networking parameters and security settings during container initialization. Mounting `/proc` as read-only blocks this necessary functionality, leading to the error. Removing the read-only flag (`- '/proc:/proc'`) allows Docker to make the required changes and resolve the issue.

  
<br />

## For Developers

To get started with development, you'll need to have [Node.js](https://nodejs.org/) and [bun](https://bun.sh/) installed.

```bash
# Clone the repo
git clone https://github.com/airoflare/statnet.git
cd statnet

# Build the docker imageand run docker image locally (I fully test using docker locally)
docker build -t metrics .

# Run the docker image on port 80
docker run -p 80:80 -v /var/run/docker.sock:/var/run/docker.sock metrics
# → Opens at http://localhost:80
```

<br />

Optional Configuration:

```bash
# If you want to allow other origins like 10.X.X.X or any Ipv4 with localhost you can add it using docker's built in enviroment argument and use the "ALLOWED_CORS_ORIGINS" enviroment variable

#Example:
docker run -p 80:80 -e ALLOWED_CORS_ORIGINS="10.0.0.8" -v /var/run/docker.sock:/var/run/docker.sock metrics

# This will allow you to access the monitor using http://10.0.0.8:80 (10.0.0.8 is an example IP, make sure to use an IP related to the machine that you are running this on)
```

<br />

## Note

I built this with [v0.dev](https://v0.dev), [Gemini CLI](https://github.com/google-gemini/gemini-cli) and [ChatGPT](https://chat.com).

I don’t really know much about Next.js or React or Go, so the codebase is kind of a mess — but it works!

I only tested this app on a home server running Linux Debian 12