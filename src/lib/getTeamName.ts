export function getTeamName(name: string) {
  switch (name) {
    case "FUTSAL 11 ÉTOILES BRUXELLES":
      return "FT 11 Étoiles";
    case "RACING WHITE WOLUWE FUTSAL 2":
      return "Racing White Woluwe 2";
    case "MAKASI BRUXELLES 2":
      return "MAKASI 2";
    case "FC DUCKSTER BRUXELLES":
      return "FC Duckster";
    case "FC AÏT BRUXELLES":
      return "FC Aït";
    case "FSE JETTE CREW 2":
      return "FSE Jette Crew 2";
    case "FC SOKOL BRUXELLES 3":
      return "FC Sokol 3";
    case "ATLAS BRUSSEL":
      return "ATLAS";
    case "DB TEAM WOLUWE-SAINT-LAMBERT":
      return "DB Team";
    case "GYM ÉQUILIBRE MAROLLES BRUXELLES 2":
      return "G.E. Marolles 2";
    case "CANONNIERS ETTERBEEK":
      return "Canonniers";
    case "MAMBO SCHAERBEEK NP":
      return "Mambo NP";
    default:
      return name;
  }
}
