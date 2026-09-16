/**
 * En developpement seulement : les erreurs JavaScript de la page s'affichent
 * en bas de l'ecran, dans un encadre rouge. Sur un telephone il n'y a pas de
 * console a ouvrir, et un ecran qui reste inerte ne dit pas pourquoi.
 *
 * Tout est en script brut, place avant les paquets de l'application : une
 * erreur de syntaxe dans un paquet, un fichier qui ne se charge pas ou un
 * plantage au demarrage de React se voient quand meme.
 */
const SCRIPT = `(function(){
  var boite=null;
  function montrer(texte){
    if(!boite){
      boite=document.createElement('div');
      boite.setAttribute('role','alert');
      boite.style.cssText='position:fixed;left:8px;right:8px;bottom:80px;z-index:9999;max-height:45vh;overflow:auto;padding:10px 12px;border:1px solid #ff8080;border-radius:6px;background:#122642;color:#ffb3b3;font:12px/1.4 -apple-system,system-ui,sans-serif;white-space:pre-wrap;word-break:break-word';
      boite.textContent='Erreurs JavaScript (affichees en developpement)\\n'+navigator.userAgent+'\\n';
      (document.body||document.documentElement).appendChild(boite);
    }
    boite.textContent+='\\n- '+texte;
  }
  window.addEventListener('error',function(e){
    // Un avertissement du navigateur, pas une erreur : FullCalendar mesure ses
    // cases en boucle et le navigateur coupe court. Rien ne casse.
    if(e.message&&e.message.indexOf('ResizeObserver loop')===0)return;
    var cible=e.target;
    if(!e.message&&cible&&cible!==window){
      var src=(cible.src||cible.href||'');
      montrer('Chargement echoue : '+(cible.tagName||'?').toLowerCase()+' '+src.split('/').pop());
      return;
    }
    montrer((e.message||'Erreur')+' ('+String(e.filename||'?').split('/').pop()+':'+e.lineno+')');
  },true);
  window.addEventListener('unhandledrejection',function(e){
    var r=e.reason;
    montrer('Promesse rejetee : '+(r&&r.message?r.message:String(r)));
  });
})();`;

export default function RapporteurErreurs() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
