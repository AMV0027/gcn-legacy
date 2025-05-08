from typing import Tuple, List
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

async def scrape_webpage(url: str) -> str:
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            await page.goto(url, timeout=15000)
            html = await page.content()
            await browser.close()

            soup = BeautifulSoup(html, 'html.parser')
            main_content = soup.find('main') or soup.body

            if not main_content:
                return ""

            for tag in main_content.find_all(['header', 'footer', 'nav', 'script', 'style']):
                tag.decompose()

            text = main_content.get_text(separator=' ', strip=True)
            return text[:10000]
    except Exception as e:
        print(f"Error scraping {url} with Playwright: {e}")
        return ""

async def get_online_context(query: str, num_results: int = 3) -> Tuple[str, List[dict]]:
    try:
        from search_online import get_serpapi_links
        
        search_results = get_serpapi_links(query, num_results)
        
        formatted_content = []
        used_links = []

        for result in search_results:
            url = result["url"]
            content = await scrape_webpage(url)
            if content:
                formatted_content.append(f"url: {url}\ncontent: {content}")
                used_links.append({
                    "url": url,
                    "title": result["title"],
                    "snippet": result["snippet"]
                })
        print(f'scrapped web content\n\n{"".join(formatted_content), used_links}')
        return "\n\n".join(formatted_content), used_links
    except Exception as e:
        print(f"Error getting online content: {e}")
        return "", []
