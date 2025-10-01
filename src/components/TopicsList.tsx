import { List, ListItem, ListItemText, Paper } from "@mui/material";

interface TopicsListProps {
  topics: string[];
}

const TopicsList: React.FC<TopicsListProps> = ({ topics }) => {
  return (
    <Paper style={{ maxHeight: 300, overflow: "auto" }}>
      <List>
        {topics.map((topic, index) => (
          <ListItem key={index}>
            <ListItemText primary={topic} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default TopicsList;
