import trafilatura

url = 'https://daedalus-ts.com/2024/06/04/comprehensive-guide-to-electrical-safety-standards/'
downloaded = trafilatura.fetch_url(url)
result = trafilatura.extract(downloaded)
print(result)
