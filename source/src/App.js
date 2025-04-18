import React from 'react';
import { useState,useEffect } from "react";
import { Button, Select, MenuItem, TextField, Card, CardContent, Typography, Grid, Container, Drawer, FormControlLabel, Checkbox } from '@mui/material';
import Papa from "papaparse";
import Tooltip from "./Tooltip";
import { Buffer } from "buffer"; // Для работы с Base64
import LZString from "lz-string";

const compress = (data) => LZString.compressToEncodedURIComponent(data);
const decompress = (compressed) => LZString.decompressFromEncodedURIComponent(compressed);

const DEFAULT_ARTIFACTS_CSV = "./artifacts.csv"; // Path to the default CSV file
const ArtifactCalculator = () => {
  const [selectedArtifacts, setSelectedArtifacts] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [savedBuilds, setSavedBuilds] = useState({});
  const [filterStats, setFilterStats] = useState({});
  const [buildName, setBuildName] = useState(""); // State for build name input
  const [selectedTemplate, setSelectedTemplate] = useState(""); // State for build name input


  // Function to load artifacts from the default CSV file
  const loadDefaultArtifacts = () => {
    fetch(DEFAULT_ARTIFACTS_CSV)
        .then(response => response.text())
        .then(data => {
          Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
              const parsedArtifacts = result.data.map((row, index) => {
                let name = row["Имя"] || "";
                if (!row["Имя"]) {
                  for (let i = index - 1; i >= 0; i--) {
                    if (result.data[i]["Имя"]) {
                      name = result.data[i]["Имя"];
                      break;
                    }
                  }
                }
                return {
                  name,
                  tier: Number(row["Тир"]) || 1,
                  ...Object.fromEntries(
                      Object.entries(row).map(([key, value]) => [key, Number(value) || 0])
                  )
                };
              });
              setArtifacts(parsedArtifacts);
            },
          });
        });
  };

  // Load saved builds from local storage
  useEffect(() => {
    const loadedBuilds = localStorage.getItem("savedBuilds");
    if (loadedBuilds) {
      setSavedBuilds(JSON.parse(loadedBuilds));
    }
  }, []);





  useEffect(() => {
    loadDefaultArtifacts(); // Load default artifacts on mount
    const params = new URLSearchParams(window.location.search);
    const compressedBuild = params.get("b");
    if (compressedBuild) {
      try {
        const decompressedData = decompress(compressedBuild);
        if (decompressedData) {
          setSelectedArtifacts(JSON.parse(decompressedData));
        }
      } catch (error) {
        console.error("Ошибка загрузки сборки из ссылки", error);
      }
    }
  }, []);


  const selectArtifact = (artifact) => {
    setSelectedArtifacts((prev) => [...prev, { name: artifact.name, tier: artifact.tier }]);
    // setOpenDialog(false);
  };

  const removeArtifact = (index) => {
    setSelectedArtifacts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTier = (index, tier) => {
    setSelectedArtifacts((prev) => {
      const updated = [...prev];
      updated[index].tier = Number(tier);
      return updated;
    });
  };

  const saveBuild = (name) => {
    const buildNameToSave = name || `Build_${new Date().toISOString().slice(0, 16).replace("T", "_").replace(/:/g, "-")}`;
    setSavedBuilds((prev) => ({ ...prev, [buildNameToSave]: selectedArtifacts }));
    localStorage.setItem("savedBuilds", JSON.stringify({ ...savedBuilds, [buildNameToSave]: selectedArtifacts }));
    setBuildName(""); // Clear the build name input after saving
  };

  const loadBuild = (name) => {
    if (savedBuilds[name]) {
      setSelectedArtifacts(savedBuilds[name]);
    }
  };

  const deleteBuild = (name) => {
    const updatedBuilds = { ...savedBuilds };
    delete updatedBuilds[name];
    setSavedBuilds(updatedBuilds);
    localStorage.setItem("savedBuilds", JSON.stringify(updatedBuilds));
    setSelectedTemplate("");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const parsedArtifacts = result.data.map((row, index) => {
            let name = row["Имя"] || "";
            if (!row["Имя"]) {
              for (let i = index - 1; i >= 0; i--) {
                if (result.data[i]["Имя"]) {
                  name = result.data[i]["Имя"];
                  break;
                }
              }
            }
            return {
              name,
              tier: Number(row["Тир"]) || 1,
              ...Object.fromEntries(
                  Object.entries(row).map(([key, value]) => [key, Number(value) || 0])
              )
            };
          });
          setArtifacts(parsedArtifacts);
        },
      });
    }
  };

  const generateShareableLink = () => {
    const compressedData = compress(JSON.stringify(selectedArtifacts));
    const shareableURL = `${window.location.origin}${window.location.pathname}?b=${compressedData}`;
    navigator.clipboard.writeText(shareableURL).then(() => {
      alert("Ссылка на сборку скопирована!");
    });
  };


  const artifactCounts = selectedArtifacts.reduce((acc, artifact) => {
    const key = `${artifact.name} (Тир ${artifact.tier})`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const calculateStats = () => {
    return selectedArtifacts.reduce((acc, artifact) => {
      const fullArtifact = artifacts.find(a => a.name === artifact.name && a.tier === artifact.tier);
      if (fullArtifact) {
        Object.keys(fullArtifact).forEach((key) => {
          if (!["name", "tier", "Тир", "Имя", "№"].includes(key)) {
            acc[key] = (acc[key] || 0) + (fullArtifact[key] || 0);
          }
        });
      }
      return acc;
    }, {});
  };

  const stats = calculateStats();
  const MAX_TIERS = Math.max(...artifacts.map(a => a.tier), 4);
  const groupedArtifacts = Array.from({ length: MAX_TIERS }, () => []);

  artifacts.forEach((artifact) => {
    const tierIndex = Math.min(artifact.tier - 1, MAX_TIERS - 1);
    groupedArtifacts[tierIndex].push(artifact);
  });


  const uniqueStats = [...new Set(artifacts.flatMap(a => Object.keys(a)))].filter(stat => !["name", "tier", "Имя", "Тир", "№","Сколько?"].includes(stat));

  const handleStatFilterChange = (stat) => {
    setFilterStats(prev => ({ ...prev, [stat]: !prev[stat] }));
  };

  const filteredArtifacts = artifacts.filter(artifact =>
      Object.entries(filterStats).every(([stat, isChecked]) => !isChecked || (artifact[stat] > 0 || artifact[stat] < 0))
  );




  return (
      <>

        <Container maxWidth="lg" className="p-4" style={{ display: 'flex' }}>

          <Drawer variant="permanent" anchor="left" style={{ width: '500px' }}>
            <Typography variant="h6" gutterBottom style={{ padding: '10px' }}>Список артефактов</Typography>
            <Typography variant="subtitle1">Фильтр по статам:</Typography>
            <Container maxWidth="lg" className="p-4" style={{
              display: 'flex',
              width: '500px',
              overflowWrap: 'break-word', // Лучше чем wordWrap
              flexWrap: 'wrap',
              alignContent: 'space-around',
              justifyContent: 'flex-start',
              alignItems: 'flex-start'
            }}>
              {uniqueStats.map(stat => (
                  <FormControlLabel style={{border: "1px solid" }}
                                    key={stat}
                                    control={<Checkbox checked={!!filterStats[stat]} onChange={() => handleStatFilterChange(stat)} />}
                                    label={<Typography style={{ whiteSpace: 'normal', wordWrap: 'break-word', width: '100px'  }}>{stat}</Typography>}
                  />
              ))}
            </Container>
            <Grid container spacing={2} className="mb-4" style={{ width: '500px' }}>
              {filteredArtifacts.map((artifact, index) => (
                  <Grid item xs={12 / 4} key={`${artifact.name}-${index}`}>
                    <Tooltip>
                      <Card
                          tooltip={
                            <>
                              <Typography variant="h6" gutterBottom>Суммарные характеристики</Typography>
                              {Object.entries(artifacts.find(a => a.name === artifact.name && a.tier === artifact.tier)||{}).map(([key, value]) => {

                                return value !== 0 && !["tier", "№"].includes(key) ? (
                                    <Typography key={key}>{key}: {value}</Typography>
                                ) : null;
                              })}
                            </>
                          }
                          key={index} variant="outlined" onClick={() => selectArtifact(artifact)} style={{ margin: '0.5px', cursor: 'pointer' }}>
                        <div>
                          <Typography variant="body1">{artifact.name}</Typography>
                          <Typography variant="body2">Тир {artifact.tier}</Typography>
                        </div>
                      </Card>
                    </Tooltip>
                  </Grid>
              ))}

            </Grid>
          </Drawer>
          <Container maxWidth="md">

            <Typography variant="h5" gutterBottom>Калькулятор артефактов</Typography>
            <Grid container spacing={2} className="mb-4">
              {([...selectedArtifacts].sort((a, b) => {
                if (a.name === b.name) {
                  return b.tier - a.tier;
                }
                return a.name.localeCompare(b.name);
              })).map((artifact, index) => (
                  <Grid item xs={12 / 4} key={`${artifact.name}-${index}`}>
                    <Card variant="outlined" style={{ margin: '0.5px', cursor: 'pointer' }}>
                      <Tooltip>
                        <CardContent style={{ margin: '0.5px', padding: '0.5px' }} tooltip={
                          <>
                            <Typography variant="h6" gutterBottom>Суммарные характеристики</Typography>
                            {Object.entries(artifacts.find(a => a.name === artifact.name && a.tier === artifact.tier)||{}).map(([key, value]) => {

                              return value !== 0 && !["tier", "№"].includes(key) ? (
                                  <Typography key={key}>{key}: {value}</Typography>
                              ) : null;
                            })}
                          </>
                        }>
                          <Typography variant="h6" align="center">{artifact.name}</Typography>
                          <Select
                              value={artifact.tier}
                              onChange={(e) => updateTier(index, e.target.value)}
                              displayEmpty
                              fullWidth
                              variant="outlined"
                              margin="normal"
                          >
                            {[...Array(MAX_TIERS).keys()].map(tier => (
                                <MenuItem key={tier + 1} value={tier + 1}>{`Тир ${tier + 1}`}</MenuItem>
                            ))}
                          </Select>
                          <div style={{ display: 'flex' }}>
                            <Button variant="contained" color="error" onClick={() => removeArtifact(index)}>Удалить</Button>
                            <Button variant="contained" color="error" onClick={() => selectArtifact(artifact)}>+</Button>
                          </div>

                        </CardContent>
                      </Tooltip>
                    </Card>
                  </Grid>
              ))}
            </Grid>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Количество артефактов ({selectedArtifacts.length})  <Button variant="contained" color="primary" onClick={generateShareableLink}>
                  Поделиться сборкой
                </Button></Typography>
                {Object.entries(artifactCounts).map(([artifact, count]) => (
                    <Typography key={artifact}>{artifact}: {count} шт.</Typography>
                ))}
                <Typography variant="h6" gutterBottom>Суммарные характеристики</Typography>
                {Object.entries(stats).map(([key, value]) => value !== 0 && <Typography key={key}>{key}: {value}</Typography>)}
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Сохраненные шаблоны</Typography>
                <TextField
                    value={buildName}
                    onChange={(e) => setBuildName(e.target.value)}
                    label="Введите название шаблона"
                    variant="outlined"
                    fullWidth
                />
                <Button variant="contained" onClick={() => saveBuild(buildName)}>Сохранить шаблон</Button>
                <Select
                    onChange={(e) => {
                      loadBuild(e.target.value)
                      setSelectedTemplate(e.target.value)

                    }}
                    displayEmpty
                    variant="outlined"
                    fullWidth
                    value={selectedTemplate}
                >
                  <MenuItem value="">Загрузить шаблон (не выбран)</MenuItem>
                  {Object.keys(savedBuilds).map((name) => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                  ))}
                </Select>
                <Button variant="contained" color="error" onClick={() => deleteBuild(selectedTemplate!= "" ? selectedTemplate : prompt("Введите название шаблона для удаления"))}>
                  Удалить шаблон
                </Button>
              </CardContent>
            </Card>
          </Container>
        </Container>

      </>
  );
};

function App() {
  return (
      <React.StrictMode>
        <ArtifactCalculator />
      </React.StrictMode>
  );
}

export default App;
