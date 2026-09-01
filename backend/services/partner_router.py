from math import radians, sin, cos, sqrt, atan2

from data.partners import get_all_partners


def calculate_distance(
    lat1,
    lon1,
    lat2,
    lon2
):

    earth_radius = 6371

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        +
        cos(radians(lat1))
        * cos(radians(lat2))
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )

    return earth_radius * c


def find_suitable_partners(
    latitude,
    longitude,
    loan_type=None,
    scheme_id=None
):

    results = []

    for partner in get_all_partners():

        if loan_type:

            if loan_type not in partner["loan_types"]:
                continue

        if scheme_id:

            if scheme_id not in partner["schemes"]:
                continue

        distance = calculate_distance(
            latitude,
            longitude,
            partner["latitude"],
            partner["longitude"]
        )

        result = partner.copy()

        result["distance_km"] = round(
            distance,
            2
        )

        results.append(result)

    results.sort(
        key=lambda x: x["distance_km"]
    )

    return results