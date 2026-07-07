import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const STATIC_DIAGRAMS = [
  { id: 's-tx-1', name: 'Flujo de Pago Electrónico',       cat: 'tx', description: 'Procesamiento de pagos end-to-end',                  filePath: '/diagrams/transaccional/pago-electronico.png',    isStatic: true, sortOrder: 1 },
  { id: 's-tx-2', name: 'Gateway de Transacciones',        cat: 'tx', description: 'Componentes del gateway y flujo de autorización',     filePath: '/diagrams/transaccional/gateway-tx.png',          isStatic: true, sortOrder: 2 },
  { id: 's-tx-3', name: 'Liquidación y Conciliación',      cat: 'tx', description: 'Proceso de liquidación bancaria',                     filePath: '/diagrams/transaccional/liquidacion.png',         isStatic: true, sortOrder: 3 },
  { id: 's-tx-4', name: 'Bus de Mensajería',               cat: 'tx', description: 'Arquitectura orientada a eventos',                    filePath: '/diagrams/transaccional/bus-mensajeria.png',      isStatic: true, sortOrder: 4 },
  { id: 's-tx-5', name: 'Seguridad y Fraud Detection',     cat: 'tx', description: 'Capas de seguridad y detección de fraude',            filePath: '/diagrams/transaccional/fraude.png',              isStatic: true, sortOrder: 5 },
  { id: 's-cl-1', name: 'Arquitectura AWS Multi-Region',   cat: 'cl', description: 'Alta disponibilidad con failover en AWS',             filePath: '/diagrams/cloud/aws-multiregion.png',             isStatic: true, sortOrder: 6 },
  { id: 's-cl-2', name: 'Microservicios en Kubernetes',    cat: 'cl', description: 'Orquestación de contenedores en EKS/GKE',             filePath: '/diagrams/cloud/k8s-microservicios.png',          isStatic: true, sortOrder: 7 },
  { id: 's-cl-3', name: 'Data Lake en Azure',              cat: 'cl', description: 'Ingesta y análisis de datos en Azure',                filePath: '/diagrams/cloud/azure-datalake.png',              isStatic: true, sortOrder: 8 },
  { id: 's-cl-4', name: 'Serverless — GCP Cloud Run',      cat: 'cl', description: 'Arquitectura serverless en Google Cloud',             filePath: '/diagrams/cloud/gcp-serverless.png',              isStatic: true, sortOrder: 9 },
  { id: 's-cl-5', name: 'CDN + WAF Global',                cat: 'cl', description: 'Distribución global con protección WAF',              filePath: '/diagrams/cloud/cdn-waf.png',                     isStatic: true, sortOrder: 10 },
  { id: 's-cl-6', name: 'DevOps Pipeline CI/CD',           cat: 'cl', description: 'Pipeline automatizado CI/CD',                        filePath: '/diagrams/cloud/cicd.png',                        isStatic: true, sortOrder: 11 },
  { id: 's-op-1', name: 'Data Center Tier III',            cat: 'op', description: 'Diseño físico con redundancia N+1',                   filePath: '/diagrams/onpremise/datacenter-tier3.png',        isStatic: true, sortOrder: 12 },
  { id: 's-op-2', name: 'Red Corporativa Segmentada',      cat: 'op', description: 'VLANs, firewall y DMZ corporativo',                  filePath: '/diagrams/onpremise/red-corporativa.png',         isStatic: true, sortOrder: 13 },
  { id: 's-op-3', name: 'Cluster de Alta Disponibilidad',  cat: 'op', description: 'Cluster activo-activo con balanceo',                 filePath: '/diagrams/onpremise/ha-cluster.png',              isStatic: true, sortOrder: 14 },
  { id: 's-op-4', name: 'Backup y Recuperación',           cat: 'op', description: 'Estrategia de respaldo y DR',                        filePath: '/diagrams/onpremise/backup-dr.png',               isStatic: true, sortOrder: 15 },
  { id: 's-hb-1', name: 'Extensión a Cloud — Burst',       cat: 'hb', description: 'Escalamiento dinámico hacia cloud',                  filePath: '/diagrams/hibrida/cloud-burst.png',               isStatic: true, sortOrder: 16 },
  { id: 's-hb-2', name: 'VPN Site-to-Site',                cat: 'hb', description: 'Conectividad segura datacenter-nube',                filePath: '/diagrams/hibrida/vpn-site2site.png',             isStatic: true, sortOrder: 17 },
  { id: 's-hb-3', name: 'Identidad Federada (SAML/OIDC)',  cat: 'hb', description: 'SSO federado AD on-premise y cloud',                 filePath: '/diagrams/hibrida/identidad-federada.png',        isStatic: true, sortOrder: 18 },
  { id: 's-hb-4', name: 'Almacenamiento Híbrido',          cat: 'hb', description: 'Tiering local y object storage',                     filePath: '/diagrams/hibrida/storage-hibrido.png',           isStatic: true, sortOrder: 19 },
]

async function main() {
  console.log('Seeding database...')
  for (const diagram of STATIC_DIAGRAMS) {
    await prisma.diagram.upsert({
      where: { id: diagram.id },
      update: {},   // don't overwrite existing edits
      create: diagram,
    })
  }
  console.log(`Seeded ${STATIC_DIAGRAMS.length} static diagrams.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
