from data.schemes_kb import SCHEMES_KNOWLEDGE_BASE, get_all_schemes_kb, get_scheme_by_id_kb

# Provide SCHEMES list for backward compatibility across all modules
SCHEMES = SCHEMES_KNOWLEDGE_BASE


def get_all_schemes():
    return SCHEMES_KNOWLEDGE_BASE


def get_scheme_by_id(scheme_id: str):
    for scheme in SCHEMES_KNOWLEDGE_BASE:
        if scheme["id"] == scheme_id:
            return scheme
    return None