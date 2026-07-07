# Diagramas de Arquitectura

Coloca los archivos de imagen en cada subcarpeta según la categoría.

## Estructura de carpetas

```
diagrams/
├── transaccional/    ← Arquitectura Transaccional
│   ├── pago-electronico.png
│   ├── gateway-tx.png
│   ├── liquidacion.png
│   ├── bus-mensajeria.png
│   └── fraude.png
│
├── cloud/            ← Soluciones Cloud
│   ├── aws-multiregion.png
│   ├── k8s-microservicios.png
│   ├── azure-datalake.png
│   ├── gcp-serverless.png
│   ├── cdn-waf.png
│   └── cicd.png
│
├── onpremise/        ← Soluciones On-Premise
│   ├── datacenter-tier3.png
│   ├── red-corporativa.png
│   ├── ha-cluster.png
│   └── backup-dr.png
│
└── hibrida/          ← Soluciones Híbridas
    ├── cloud-burst.png
    ├── vpn-site2site.png
    ├── identidad-federada.png
    └── storage-hibrido.png
```

## Agregar nuevos diagramas

Edita el array `DIAGRAMS` en `index.html`:

```js
{
  name: "Nombre del diagrama",
  category: "transaccional",   // transaccional | cloud | onpremise | hibrida
  file: "diagrams/transaccional/mi-archivo.png",
  description: "Descripción breve del diagrama"
}
```

## Formatos soportados

PNG, JPG, SVG, WebP — cualquier formato de imagen soportado por el navegador.
