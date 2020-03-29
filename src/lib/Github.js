import { randomBytes } from 'crypto'
import { parse } from 'url'
import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'
import Spinner from './Spinner.js'
import { exec, getEnv, request, noNew, debug, scriptDir } from '../utils.js'
import { y, r, dw } from '../ansi-escape.js'

class Github {
  constructor() {
    this.stateToken = randomBytes(16).toString('hex')
    this.server = createServer()
    this.spinner = Spinner('Loading…')
    this.clientId = 'aa50f82a79aac4c097c0'
  }

  authenticate = async (username) => {
    await this.startServer()
    const url = await this.getLoginUrl(username)
    await this.openBrowser(url)
    const code = await this.getCode()
    const token = await this.getToken(code)
    this.authToken = token
    process.stdout.write('\n')
    return token
  }

  getLoginUrl = async (username) => {
    const response = await request('https://github.com/login/oauth/authorize', {
      client_id: this.clientId,
      login: username,
      scope: 'repo',
      state: this.stateToken,
    })
    return response.headers.location
  }

  openBrowser = async (url) => {
    const command = this.getOpenCommand(url)
    let message
    if (!command) {
      message = 'You need to copy/paste the url in your browser to authorize gitinit from github\n'
    } else {
      message = 'Opening browser… Copy/paste the url otherwise to authorize gitinit from github\n'
    }
    console.log(`${y(message)}${dw(url)}`)
    const { stderr } = await exec(command)
    if (stderr) console.error(r(stderr))
  }

  getOpenCommand = (url) => {
    if (process.env.WSL_DISTRO_NAME || process.platform === 'win32') {
      return `powershell.exe start '${url.split('&').join('"&"')}'`
    }
    if (process.platform === 'linux') {
      return `which xdg-open && xdg-open '${url}'; which xdg-open || open '${url}'`
    }
    return false
  }

  startServer = () => {
    this.server.on('request', (req, res) => {
      const { pathname } = parse(req.url)

      switch (pathname) {
        case '/favicon.ico':
          this.serveStatic('favicon.ico', res)
          break
        case '/gitinit_logo.jpg':
          this.serveStatic('gitinit_logo.jpg', res)
          break
        case '/callback': {
          this.spinner.start()
          this.serveStatic('callback.html', res, { 'Content-type': 'text/html; charset=utf-8' })
          const query = parse(req.url, true).query
          if (query.state !== this.stateToken) {
            throw new Error("Response state doesn't match what have been sent")
          }

          this.server.emit('code', query.code)
          this.server.close(() => debug('Server closed'))
          break
        }
        default:
          res.writeHead(404)
          res.end('404 Not Found')
      }
    })

    return new Promise((resolve) => {
      this.server.listen(5000, () => {
        debug('Started callback server on port 5000')
        resolve()
      })
    })
  }

  serveStatic = (fileName, res, options = {}) => {
    res.writeHead(200, options)
    res.end(readFileSync(join(scriptDir, 'src', 'resource', 'html', fileName)))
  }

  getCode = () => {
    return new Promise((resolve) => {
      this.server.on('code', (code) => {
        resolve(code)
      })
    })
  }

  getToken = async (code) => {
    const response = await request(
      'https://github.com/login/oauth/access_token',
      {
        client_id: this.clientId,
        client_secret: getEnv.client_secret,
        code: code,
        state: this.stateToken,
      },
      { method: 'POST' }
    )
    this.spinner.stop()
    return response.body.split('=')[1].split('&')[0]
  }

  apiRequest = async (url, body, method = 'POST') => {
    const response = await request(`https://api.github.com${url}`, body, {
      method,
      headers: { Authorization: `token ${this.authToken}`, 'User-Agent': '@yo/gitinit' },
    })
    if (response.body) {
      response.body = JSON.parse(response.body)
    }
    return response
  }

  createRepo = async ({ name, description, visibility }) => {
    const response = await this.apiRequest('/user/repos', {
      name,
      description,
      private: visibility === 'private' && true,
    })
    if (!response.body.ssh_url) throw new Error(response.body.message)
    return response.body
  }

  deleteRepo = async (name) => {
    const response = await this.apiRequest(`/repos/elliotbe/${name}`, null, 'DELETE')
    return response.statusCode
  }
}

export default noNew(Github)
