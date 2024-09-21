const puppeteer = require('puppeteer')
require('dotenv').config()
//
;(async () => {
  // Take the urls from the command line
  var args = process.argv.slice(2)

  try {
    // launch a new headless browser
    const browser = await puppeteer.launch({ headless: 'new' })

    // loop over the urls
    for (let i = 0; i < args.length; i++) {
      // check for https for safety!
      if (args[i].includes('http://')) {
        const page = await browser.newPage()

        // set the viewport size
        await page.setViewport({
          width: 960,
          height: 540,
          deviceScaleFactor: 1
        })

        // tell the page to visit the url
        await page.goto(args[i])

        if (process.env.GITHUB_TOKEN) {
          console.log('Github token found, using it to make requests.')
          await page.type('#github-token', process.env.GITHUB_TOKEN)
        }

        // click on the fetch button
        await page.click('#save-repo-url')

        // wait for 10s
        await new Promise((resolve) => setTimeout(resolve, 10000))

        // click on the generate env button
        await page.click('#generate-env-example')

        // wait 30s
        await new Promise((resolve) => setTimeout(resolve, 30000))

        // go to the top of the page
        await page.evaluate(() => {
          window.scrollTo(0, 0)
        })

        // wait for 1s
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // take a screenshot and save it in the screenshots directory
        await page.screenshot({ path: `./public/og.png` })

        // done!
        console.log(`✅ Screenshot of ${args[i]} saved!`)
      } else {
        console.error(`❌ Could not save screenshot of ${args[i]}!`)
      }
    }

    // close the browser
    await browser.close()
  } catch (error) {
    console.log(error)
  }
})()
