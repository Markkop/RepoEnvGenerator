
export async function handleCopyToClipboard(
  mergedFiles: string,
  setShowCopyConfirmation: (show: boolean) => void,
  clipboardAPI: Clipboard
): Promise<void> {
  try {
    await clipboardAPI.writeText(mergedFiles)
    setShowCopyConfirmation(true)
    setTimeout(() => {
      setShowCopyConfirmation(false)
    }, 2000)
  } catch (err) {
    console.error(`Could not copy text: ${err}`)
  }
}

export function retrieveValueFromLocalStorage(key: string, setter: (value: any) => void, defaultValue?: any): void {
  const savedValue = localStorage.getItem(key);
  if (savedValue) {
    setter(savedValue);
  } else if (defaultValue) {
    setter(defaultValue);
  }
}

export async function githubAPIRequest(url: string, token: string, acceptRaw = false) {
  try {
    const headers = {} as any
    if (token) {
      headers.Authorization = `token ${token}`
      if (acceptRaw) {
        headers.Accept = 'application/vnd.github.v3.raw'
      }
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      const json = await response.json()
      throw new Error(json.message)
    }

    return acceptRaw ? await response.text() : await response.json()
  } catch (error) {
    throw error
  }
}

export async function openAIRequest(
  method: string = 'GET',
  endpoint: string,
  apiKey?: string,
  body?: any,
): Promise<any> {
  try {
    const headers = {} as any
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    if (method === 'POST') {
      headers['Content-Type'] = 'application/json'
    }

    const config = {
      method,
      headers,
    } as any

    if (body) {
      config.body = JSON.stringify(body)
    }

    const response = await fetch(`https://api.openai.com/v1/${endpoint}`, config)

    if (!response.ok) {
      const json = await response.json()
      throw new Error(`OpenAI API error: ${json.error.message} (${json.error.code})`)
    }

    return await response.json()
  } catch (error) {
    console.error(error)
    throw error
  }
}

export function formatDate(date: Date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'short',
  })
}

export async function generateEnvExample(repoUrl: string, token: string, selectedFiles: any[]): Promise<string> {
  const uniqueKeys = new Set<string>()
  for (const file of selectedFiles) {
    try {
      const content = await githubAPIRequest(file.url, token, true)
      const keys = extractEnvKeys(content)
      keys.forEach(key => uniqueKeys.add(key))
    } catch (error) {
      console.error(`Error processing file ${file.path}:`, error)
    }
  }
  return Array.from(uniqueKeys).sort().map(key => `${key}=`).join('\n')
}

function extractEnvKeys(content: string): string[] {
  const regex = /process\.env\.([A-Z0-9_]+)/g
  const keys: string[] = []
  let match

  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      keys.push(match[1])
    }
  }

  return keys
}