// Fonction mock pour le polling des statuts de mise à jour des compétitions
// À adapter selon ta logique backend réelle

export async function getCompetitionUpdateStatus(
  competitionIds: number[],
): Promise<any[]> {
  // Ici, tu dois interroger la base ou le backend pour chaque compétition
  // Exemple mock : toutes terminées avec succès
  return competitionIds.map((id) => ({
    competitionId: id,
    finished: true,
    success: true,
    error: null,
  }));
}
