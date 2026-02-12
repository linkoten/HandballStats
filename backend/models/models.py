# models.py - Modèles Pydantic pour l'API

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class EquipeBase(BaseModel):
    nom: str
    ville: str
    club: Optional[str] = None
    region: Optional[str] = None
    departement: Optional[str] = None


class EquipeCreate(EquipeBase):
    pass


class Equipe(EquipeBase):
    id: int

    class Config:
        from_attributes = True


class JoueurBase(BaseModel):
    nom_prenom: str
    num_maillot: Optional[int] = None
    id_equipe: int
    poste_principal: Optional[str] = None
    postes_secondaires: Optional[List[str]] = None


class JoueurCreate(JoueurBase):
    pass


class Joueur(JoueurBase):
    id: int

    class Config:
        from_attributes = True


class MatchBase(BaseModel):
    match_url: str
    pdf_url: Optional[str] = None
    competition_name: str
    equipe_recevant_id: int
    equipe_exterieur_id: int
    score_final: str
    date_match: Optional[datetime] = None
    arbitre_1: Optional[str] = None
    arbitre_2: Optional[str] = None
    cartons_jaunes_adversaire: int = 0
    exclusions_2min_adversaire: int = 0
    cartons_rouges_adversaire: int = 0
    sept_metres_adversaire: int = 0
    classement_equipe_recevant: Optional[int] = None
    partie_tableau_equipe_recevant: Optional[str] = None
    classement_equipe_exterieur: Optional[int] = None
    partie_tableau_equipe_exterieur: Optional[str] = None


class MatchCreate(MatchBase):
    pass


class Match(MatchBase):
    id: int

    class Config:
        from_attributes = True


class StatistiqueJoueurBase(BaseModel):
    id_match: int
    id_joueur: int
    buts: int = 0
    sept_metres: int = 0
    tirs: int = 0
    arrets: int = 0
    avertissements: int = 0
    exclusions_2min: int = 0
    discipline: int = 0


class StatistiqueJoueurCreate(StatistiqueJoueurBase):
    pass


class StatistiqueJoueur(StatistiqueJoueurBase):
    id: int

    class Config:
        from_attributes = True


class StatistiqueJoueurDetailed(StatistiqueJoueur):
    """Statistique avec informations du joueur."""
    joueur: Joueur


class MatchDetailed(Match):
    """Match avec informations complètes."""
    equipe_recevant: Equipe
    equipe_exterieur: Equipe
    statistiques: List[StatistiqueJoueurDetailed] = []


class UpdatePostesRequest(BaseModel):
    """Requête pour mettre à jour les postes de plusieurs joueurs."""
    joueur_ids: List[int]
    poste_principal: Optional[str] = None
    postes_secondaires: Optional[List[str]] = None
    operation: str = "set"  # 'set' ou 'add' pour postes_secondaires
