export function getTeamLogo(name: string) {
  switch (name) {
    case "Atletico Madrid":
      return "/assets/images/svg/teams/atm.svg";
    case "FC Barcelona":
      return "/assets/images/svg/teams/fcb.svg";
    case "Sevilla FC":
      return "/assets/images/svg/teams/sevilla.svg";
    case "Cadix CF":
      return "/assets/images/svg/teams/cadix.svg";
    case "Furia Roja":
      return "/assets/images/svg/logo-roja.svg";
    case "Real Oviedo":
      return "/assets/images/svg/teams/oviedo.svg";
    case "Real Betis":
      return "/assets/images/svg/teams/betis.svg";
    case "UD Almeria":
      return "/assets/images/svg/teams/almeria.svg";
    case "Celta Vigo":
      return "/assets/images/svg/teams/celta.svg";
    case "Real Sociedad":
      return "/assets/images/svg/teams/sociedad.svg";
    case "CA Osasuna":
      return "/assets/images/svg/teams/osasuna.svg";
    case "Valencia CF":
      return "/assets/images/svg/teams/valencia.svg";
    case "RCD Mallorca":
      return "/assets/images/svg/teams/mallorca.svg";
    case "Réal Madrid":
      return "/assets/images/svg/teams/real_madrid.svg";
    default:
      return "/assets/images/svg/teams/default.svg";
  }
}
