# Podcast Pulse

Mini application web HTML/CSS/JS pour visualiser et lire des podcasts RSS avec un style moderne.

## Fonctions

- Lecture d'episodes podcast via RSS
- Plateforme d'ecoute prete pour le public (sans saisie manuelle de flux)
- Lecture automatique de l'episode suivant
- Navigation precedent / suivant

## Lancer le projet

1. Ouvre le dossier dans VS Code.
2. Lance un serveur statique (exemple avec l'extension Live Server), ou un serveur local.
3. Ouvre `index.html` dans le navigateur.

### Demarrage rapide Windows (Node.js)

Depuis le terminal dans le dossier du projet:

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};http.createServer((req,res)=>{const clean=decodeURIComponent((req.url||'/').split('?')[0]);const rel=clean==='/'?'/index.html':clean;const file=path.join(root,rel);if(!file.startsWith(root)){res.writeHead(403);res.end('Forbidden');return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);});}).listen(8080,()=>console.log('Server running on http://localhost:8080'));"
```

Puis ouvre `http://localhost:8080`.

## Flux podcast

Le flux actif est configure dans [app.js](app.js) via `PODCAST_FEEDS`.
Tu peux en ajouter d'autres plus tard dans cette liste sans toucher l'interface utilisateur.

## Note CORS

Le navigateur peut bloquer certains flux RSS selon leur configuration CORS. Le projet utilise des proxys publics en fallback pour faciliter les tests locaux.
Pour un usage production, il est recommande d'utiliser un proxy backend maitrise.
# lolo
