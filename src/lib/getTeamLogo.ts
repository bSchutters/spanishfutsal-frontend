export function getTeamLogo(name: string) {
  switch (name) {
    case "PHOENIX EVERE 2":
      return "/assets/images/svg/teams/phoenix.svg";
    case "TP MAKASI AUDERGHEM 2":
      return "/assets/images/svg/teams/makasi.svg";
    case "LUPOPO BRUXELLES 2":
      return "/assets/images/svg/teams/lupopo.svg";
    case "FC AÏT BRUXELLES":
      return "/assets/images/svg/teams/ait.svg";
    case "JUVE PORT BRUXELLES 2":
      return "/assets/images/svg/teams/juveport.svg";
    case "FC LA RELÈVE BRUXELLES":
      return "/assets/images/svg/teams/releve.svg";
    case "UD Asturiana":
      return "/assets/images/svg/logo-asturiana.svg";
    default:
      return "/assets/images/svg/teams/default.svg";
  }
}
