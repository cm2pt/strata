from uuid import UUID

from app.schemas.common import CamelModel


class ConnectorSchema(CamelModel):
    id: UUID
    platform: str
    name: str
    status: str
    last_sync: str | None = None
    products_found: int
    cost_coverage: float
    usage_coverage: float


class CreateConnectorRequest(CamelModel):
    name: str
    connector_type: str
    credentials: dict = {}
    config_json: dict = {}
